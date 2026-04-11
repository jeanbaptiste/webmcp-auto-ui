# System Prompt -- composition dynamique et lazy loading

## 1. Principe

Le system prompt est genere dynamiquement par `buildSystemPrompt(layers)` dans
le package `@webmcp-auto-ui/agent`. Aucune app ne doit hardcoder un prompt --
`buildSystemPrompt` est la source unique.

Si l'utilisateur customise le prompt via les settings de l'app, le texte custom
est prefixe devant `buildSystemPrompt(layers)`. Sinon, le prompt genere est
utilise tel quel.

Fichier source : `packages/agent/src/tool-layers.ts`


## 2. Le prompt complet -- annote

Voici le prompt tel que genere par `buildSystemPrompt`, avec des annotations
entre crochets expliquant chaque section.

```
Tu es un assistant IA qui aide les utilisateurs en repondant a leurs questions
et en accomplissant des taches a l'aide de recettes. Pour CHAQUE nouvelle tache,
demande ou question, tu DOIS executer les etapes suivantes dans l'ordre exact.
Tu NE DOIS PAS sauter d'etapes.

  [ROLE -- cadrage general. Le LLM est un assistant structure,
   pas un chatbot a reponse libre. Il doit suivre un workflow.]

REGLE CRITIQUE : Tu DOIS executer toutes les etapes en silence. Ne genere et
ne produis AUCUNE reflexion interne, raisonnement, explication ou texte
intermediaire, a AUCUNE etape.

  [SILENCE -- empeche le LLM de produire du texte de raisonnement
   entre les tool calls. Sans cette regle, le LLM verbalise chaque
   etape ("Je vais maintenant chercher..."), ce qui consomme des
   tokens et pollue l'interface utilisateur.]

1. Tout d'abord, trouve la recette la plus pertinente en utilisant les outils
suivants pour decouvrir les recettes disponibles.

tricoteuses_mcp_search_recipes(), autoui_webmcp_search_recipes()

  [DISCOVERY -- liste dynamique. Generee depuis les layers connectees.
   Chaque serveur qui expose un tool "search_recipes" apparait ici,
   prefixe avec {serverName}_{protocol}_. Si aucun serveur n'est
   connecte, cette liste est vide.]

Apres cette etape, tu DOIS passer a l'etape suivante.

  [ANTI-BOUCLE -- sans cette instruction, le LLM a tendance a
   appeler search_recipes en boucle avec differents mots-cles.]

2. Si une recette pertinente existe, utilise les outils suivants pour lire
ses instructions.

tricoteuses_mcp_get_recipe(), autoui_webmcp_get_recipe()

  [CHARGEMENT -- meme logique dynamique. Le LLM charge le schema
   complet de la recette avant de l'executer.]

3. Suis les instructions de la recette exactement pour accomplir la tache.
Tu NE DOIS PAS produire de reflexions intermediaires ni de mises a jour de
statut. Aucune exception ! Produis UNIQUEMENT le resultat final en cas de
succes. Il doit contenir un resume en une phrase de l'action effectuee,
ainsi que le resultat final de la recette.

  [EXECUTION STRICTE -- le LLM suit la recette sans improviser.
   Le "resume en une phrase" evite les blocs de texte inutiles
   et garantit un feedback minimal dans le chat.]

4. Sauf indication contraire d'une recette, utilise ces outils pour
l'affichage de l'UI :

autoui_webmcp_widget_display
autoui_webmcp_canvas
autoui_webmcp_recall

  [RENDU -- les trois tools d'affichage sont toujours presents
   (serveur "autoui", protocol "webmcp"). widget_display rend
   des widgets visuels, canvas manipule le canevas, recall
   recupere un resultat d'outil compresse.]

Ne fabrique jamais d'URLs d'images -- utilise uniquement celles retournees
par les outils.

  [ANTI-HALLUCINATION -- les LLM ont tendance a inventer des URLs
   d'images plausibles. Cette regle force l'utilisation exclusive
   des donnees retournees par les outils.]
```


## 3. Comment `buildSystemPrompt` compose le prompt

La fonction `buildSystemPrompt` dans `tool-layers.ts` procede en trois etapes :

**Etape 1 -- Filtrage par protocol**

```ts
const mcpLayers = layers.filter((l): l is McpLayer => l.protocol === 'mcp');
const webmcpLayers = layers.filter((l): l is WebMcpLayer => l.protocol === 'webmcp');
```

Les layers sont separees en deux groupes : les serveurs MCP (protocol distant)
et les serveurs WebMCP (protocol local dans le navigateur).

**Etape 2 -- Verification des tools**

```ts
const searchRecipes = [
  ...mcpLayers.filter(l => l.tools.some(t => t.name === 'search_recipes'))
    .map(l => `${l.serverName}_mcp_search_recipes()`),
  ...webmcpLayers.filter(l => l.tools.some(t => t.name === 'search_recipes'))
    .map(l => `${l.serverName}_webmcp_search_recipes()`),
].join(', ');
```

Chaque serveur est verifie : est-ce qu'il expose reellement un tool
`search_recipes` ? Un serveur sans ce tool n'apparait pas dans le prompt.
Meme logique pour `get_recipe`.

**Etape 3 -- Injection dans le template**

Les noms complets des tools sont injectes dans le template du prompt via
interpolation. Le format est toujours `{serverName}_{protocol}_{toolName}`.

Points cles :

- Le prompt est le **meme pour toutes les apps** -- seuls les noms de tools
  changent selon les serveurs connectes.
- Si aucun serveur n'a `search_recipes`, l'etape 1 du prompt est vide mais
  presente quand meme (le LLM n'a simplement aucun outil a appeler).
- Les tools d'affichage (`widget_display`, `canvas`, `recall`) sont hardcodes
  car ils viennent toujours du serveur `autoui` en WebMCP.


## 4. Lazy loading des tools

Le systeme envoie les tools au LLM en deux phases pour economiser des tokens.

### Phase 1 -- Discovery

Au demarrage, `buildDiscoveryTools(layers)` ne retourne que les tools de
decouverte :

- `{server}_{protocol}_search_recipes` pour chaque serveur
- `{server}_{protocol}_get_recipe` pour chaque serveur
- `autoui_webmcp_widget_display` (toujours present)
- `autoui_webmcp_canvas` (toujours present)
- `autoui_webmcp_recall` (toujours present)

Code source (`tool-layers.ts`) :

```ts
export function buildDiscoveryTools(layers: ToolLayer[]): ProviderTool[] {
  for (const layer of layers) {
    if (layer.protocol === 'mcp') {
      // MCP: only search_recipes and get_recipe
    } else {
      // WebMCP: search_recipes, get_recipe,
      //         plus action tools (widget_display, canvas, recall)
    }
  }
}
```

### Phase 2 -- Activation

Dans `runAgentLoop` (`loop.ts`), des que le LLM appelle un tool d'un serveur
pour la premiere fois, tous les tools de ce serveur sont actives pour les
iterations suivantes :

```ts
const activatedServers = new Set<string>();
let activeTools = buildDiscoveryTools(options.layers ?? []);

// Dans la boucle, a chaque tool call :
const serverKey = `${serverName}_${protocol}`;
if (!activatedServers.has(serverKey)) {
  activatedServers.add(serverKey);
  const layer = layers.find(l => l.serverName === serverName && l.protocol === protocol);
  if (layer) {
    activeTools = activateServerTools(activeTools, layer);
  }
}
```

`activateServerTools` ajoute tous les tools du serveur au set actif, sans
doublons, en preservant ceux deja presents.

### Diagramme de progression

```
Iteration 1 :  [discovery tools only -- 11 tools, ~550 tokens]
    LLM appelle tricoteuses_mcp_search_recipes()
    --> serveur "tricoteuses" active

Iteration 2 :  [+ tous les tools tricoteuses -- 16 tools, ~800 tokens]
    LLM appelle tricoteuses_mcp_query_sql()
    LLM appelle autoui_webmcp_widget_display()

Iteration 3 :  [meme set -- pas de nouveau serveur touche]
    LLM continue avec les donnees
```

### Economie de tokens

| Scenario                    | Tools actifs | Tokens |
|-----------------------------|-------------|--------|
| Depart (discovery)          | 11          | ~550   |
| 1 serveur MCP active        | ~16         | ~800   |
| 2 serveurs MCP actives      | ~21         | ~1050  |
| Tout upfront (10 serveurs)  | 200+        | ~10000 |

L'economie est massive quand de nombreux serveurs sont connectes. Au lieu
d'envoyer 200+ definitions de tools a chaque iteration (10000+ tokens de
contexte), le systeme commence avec ~11 tools et n'active que ceux dont
le LLM a besoin.


## 5. Comment les apps utilisent le prompt

Toutes les apps suivent le meme pattern :

```ts
// Pattern simplifie -- toutes les apps
const effectivePrompt = $derived.by(() => {
  const base = buildSystemPrompt(layers);
  const hasCustom = systemPrompt && systemPrompt.trim().length > 0;
  return hasCustom ? `${systemPrompt}\n\n${base}` : base;
});
```

L'utilisateur peut ajouter du texte custom via les settings de l'app. Ce texte
est prefixe devant le prompt genere. Si l'utilisateur ne customise rien,
`buildSystemPrompt(layers)` est utilise seul.

Le prompt custom est un **prefixe**, pas un remplacement. Cela permet d'ajouter
des instructions supplementaires (persona, contraintes de langue, domaine
metier) sans casser le workflow en 4 etapes.

Exemple concret dans `apps/flex2/src/routes/+page.svelte` :

```ts
import { buildSystemPrompt } from '@webmcp-auto-ui/agent';

const effectivePrompt = $derived.by(() => {
  const base = buildSystemPrompt(layers);
  const hasCustom = systemPrompt && systemPrompt.trim().length > 0;
  return hasCustom ? `${systemPrompt}\n\n${base}` : base;
});
```


## 6. Exemple complet -- conversation type

Scenario : l'utilisateur demande "Montre-moi la composition de l'Assemblee
nationale".

```
+------------------------------------------------------------------+
|  ITERATION 1 -- Discovery                                        |
|                                                                   |
|  Tools disponibles : 11 (discovery only)                         |
|                                                                   |
|  User: "Montre-moi la composition de l'Assemblee nationale"      |
|                                                                   |
|  LLM --> tricoteuses_mcp_search_recipes("assemblee nationale")   |
|       Resultat: recette "hemicycle" trouvee (id: AN-composition) |
|                                                                   |
|  --> Serveur "tricoteuses" ACTIVE                                 |
|      activeTools passe de 11 a 16 tools                          |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  ITERATION 2 -- Chargement de la recette                         |
|                                                                   |
|  Tools disponibles : 16 (discovery + tricoteuses)                |
|                                                                   |
|  LLM --> tricoteuses_mcp_get_recipe("AN-composition")            |
|       Resultat: schema SQL + instructions de rendu               |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  ITERATION 3 -- Execution                                        |
|                                                                   |
|  LLM --> tricoteuses_mcp_query_sql(                              |
|            "SELECT groupe, COUNT(*) FROM deputes                  |
|             WHERE legislature_courante GROUP BY groupe"           |
|          )                                                        |
|       Resultat: donnees par groupe politique                      |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  ITERATION 4 -- Rendu                                            |
|                                                                   |
|  LLM --> autoui_webmcp_widget_display({                          |
|            widget: "hemicycle",                                   |
|            data: { groupes: [...], total: 577 }                  |
|          })                                                       |
|       Resultat: hemicycle affiche dans l'interface                |
|                                                                   |
|  LLM: "Voici la composition actuelle de l'Assemblee nationale."  |
+------------------------------------------------------------------+
```

Le workflow suit exactement les 4 etapes du prompt :
1. `search_recipes` -- trouver la recette
2. `get_recipe` -- charger les instructions
3. `query_sql` -- executer la recette (outil specifique au serveur)
4. `widget_display` -- afficher le resultat


## 7. Pourquoi ce design

**Pas de prompt hardcode** -- Le prompt est genere depuis les layers. Quand un
serveur est ajoute ou retire, le prompt se met a jour automatiquement. Une
seule source de verite, pas de synchronisation manuelle entre les apps.

**Workflow en 4 etapes** -- Le LLM suit un processus structure : decouvrir,
charger, executer, afficher. Sans ce cadrage, le LLM improvise et produit des
resultats de qualite variable. Le workflow force l'utilisation des recettes
optimisees.

**"En silence"** -- La regle critique du silence empeche le LLM de produire du
texte intermediaire. Sans cette regle, chaque etape genere un paragraphe de
raisonnement ("Je vais maintenant chercher les recettes disponibles...") qui
consomme des tokens et pollue le chat. Le resultat final est plus propre :
un widget visuel et un resume en une phrase.

**Lazy loading** -- Avec 10 serveurs MCP connectes, envoyer tous les tools
a chaque iteration coute ~10000 tokens de contexte. Le lazy loading reduit
ce cout a ~550 tokens au depart, en n'activant que les serveurs utilises.
L'economie est proportionnelle au nombre de serveurs.

**Recettes d'abord** -- Le prompt force le LLM a chercher une recette avant
d'agir. Les recettes contiennent des schemas SQL optimises, des instructions
de rendu precises, et des contraintes metier. Un LLM qui improvise sans
recette produit du SQL approximatif et des rendus generiques. Les recettes
sont la knowledge base du systeme.

**Anti-hallucination** -- La regle sur les URLs d'images est un garde-fou
concret. Les LLM generent des URLs plausibles mais fausses
(`https://example.com/hemicycle.png`). En forcant l'utilisation exclusive
des donnees retournees par les outils, le systeme elimine cette classe
d'erreurs.
