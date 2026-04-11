---
title: Recettes
description: Recettes WebMCP (UI) et recettes MCP (serveur) pour guider le LLM
sidebar:
  order: 3
---

Le systeme a deux types de recettes qui guident le LLM dans la composition d'interfaces.

## Vue d'ensemble

| Concept | Source | Role |
|---------|--------|------|
| **Recette WebMCP** | Package agent (fichiers `.md`) | Guide le LLM sur comment presenter les donnees avec les composants UI |
| **Recette MCP** | Serveur MCP (`list_recipes`/`get_recipe`) | Decrit ce que les outils retournent et comment les combiner |

## Flow complet des recettes

```
Connexion MCP                  buildSystemPrompt()              Agent loop (LLM)
     |                              |                               |
     |  1. list_recipes(server)     |                               |
     |  -> {name, description}[]    |                               |
     |                              |                               |
     |  2. Charge WEBMCP_RECIPES    |                               |
     |     (fichiers .md locaux)    |                               |
     |                              |                               |
     |          3. Injection prompt |                               |
     |          ## mcp : outils DATA + "recettes serveur (N)"       |
     |          ## webmcp : component() + "recettes UI (N)"         |
     |          (resumes courts uniquement — pas le body)            |
     |                              |                               |
     |                              |   4. list_components()        |
     |                              |   <- composants + recettes    |
     |                              |                               |
     |                              |   5. get_component("id")      |
     |                              |   <- schema ou body recette   |
     |                              |                               |
     |                              |   6. component("recipe-id")   |
     |                              |   <- body comme guide         |
     |                              |                               |
     |                              |   7. get_recipe("name")       |
     |                              |   <- body recette MCP serveur |
     |                              |                               |
     |                              |   8. component("table",{...}) |
     |                              |   -> onBlock -> Canvas        |
```

### Etape 1 : Connexion et collecte

A la connexion MCP, l'app appelle `list_recipes` sur chaque serveur. Elle recoit un tableau `{name, description}[]` — des resumes courts, pas le body complet.

```ts
const recipesResult = await client.callTool('list_recipes', {});
const mcpRecipes: McpRecipe[] = JSON.parse(recipesResult.content[0].text);
// [{ name: 'profil-depute', description: 'Fiche complete avec votes et mandats' }, ...]
```

En parallele, les recettes WebMCP built-in (`WEBMCP_RECIPES`) sont chargees depuis les fichiers `.md` du package agent.

### Etape 2 : Construction du prompt (buildSystemPrompt)

Le prompt systeme est structure en sections :

```
## mcp (Tricoteuses)
### outils DATA (12)
- query_sql: Executer une requete SQL...
- search_deputes: Chercher un depute...
### recettes serveur (2)
- profil-depute: Fiche complete avec votes et mandats
- scrutin-detail: Analyse detaillee d'un scrutin public

## webmcp
### 3 outils UI (list_components, get_component, component)
Composants disponibles : stat-card, chart, table, ...
### recettes UI (3)
- Composer un tableau de bord KPI: metriques numeriques [stat-card, chart, table, kv]
- Parlementaire profile: profil depute [profile, hemicycle, timeline]
```

Le body detaille des recettes n'est **PAS** dans le prompt. Seuls `name`, `when` et `components_used` sont injectes. Economie : ~500 tokens pour 5 recettes.

### Etape 3 : Outils envoyes au LLM

En mode smart (defaut), le LLM recoit :
- Les outils MCP (DATA) — `query_sql`, `search_deputes`, etc.
- 3 outils UI : `list_components()`, `get_component()`, `component()`

Ni `list_recipes` ni `get_recipe` ne sont envoyes comme outils au LLM. Le LLM decouvre les recettes MCP via le prompt, et leurs details via `get_recipe` (outil MCP du serveur).

### Etape 4 : Lazy loading (decouverte par l'agent)

Le body complet des recettes est charge a la demande, pas au demarrage. C'est le LLM qui decide quand il a besoin du detail :

**Recettes WebMCP :**

```
list_components()              -> liste composants + recettes WebMCP (id, when, components)
get_component("recipe-id")    -> body complet d'une recette WebMCP
component("recipe-id")         -> retourne le body comme guide de composition
```

**Recettes MCP (serveur) :**

```
get_recipe("profil-depute")    -> body complet de la recette serveur
```

Le LLM voit les noms et descriptions dans le prompt, puis demande le detail uniquement quand il en a besoin. Cela evite de gonfler le contexte initial.

## Recettes WebMCP (UI)

Les recettes WebMCP guident le LLM sur le choix des composants. Ce sont des fichiers `.md` avec frontmatter YAML, parses au build et injectes dans le prompt via `UILayer.recipes`.

### Format

```markdown
---
id: composer-tableau-de-bord-kpi
name: Composer un tableau de bord KPI
components_used: [stat-card, chart, table, kv]
when: les donnees contiennent des metriques numeriques
servers: []
layout:
  type: grid
  columns: 3
  arrangement: stat-cards en ligne, chart + table en dessous
---

## Quand utiliser
Les resultats MCP contiennent des metriques numeriques...

## Comment
1. Identifier les 3-5 KPIs principaux
2. Afficher chaque KPI en stat-card
3. Ajouter un chart si series temporelles
```

### Type Recipe

```ts
interface Recipe {
  id: string;
  name: string;
  description?: string;
  components_used?: string[];
  layout?: { type: string; columns?: number; arrangement?: string };
  when: string;            // condition de declenchement (texte libre)
  servers?: string[];      // serveurs MCP cibles (vide = universel)
  body: string;            // contenu markdown
}
```

### API

```ts
import {
  WEBMCP_RECIPES,           // 8+ recettes built-in, auto-enregistrees
  parseRecipe,               // parser un .md brut -> Recipe
  parseRecipes,              // parser un lot de .md -> Recipe[]
  recipeRegistry,            // registre singleton read-only
  registerRecipes,           // ajouter au registre
  filterRecipesByServer,     // filtrer par nom de serveur connecte
  formatRecipesForPrompt,    // formater pour injection prompt
} from '@webmcp-auto-ui/agent';
```

### Recettes built-in

| ID | Quand | Composants |
|----|-------|-----------|
| `composer-tableau-de-bord-kpi` | Metriques numeriques | stat-card, chart, table, kv |
| `afficher-oeuvres-art-collection-musee` | Collection d'images/oeuvres | gallery, cards, carousel |
| `analyser-actualites-hacker-news` | Articles/actualites | cards, table, stat-card |
| `cartographier-observations-biodiversite` | Donnees geographiques | map, stat-card, table |
| `explorer-dossiers-legislatifs` | Parcours legislatif | timeline, kv, table |
| `gallery-images` | Images multiples | gallery, carousel |
| `parlementaire-profile` | Profil depute/senateur | profile, hemicycle, timeline |
| `rechercher-textes-juridiques` | Textes de loi | list, kv, code |
| `weather-viz` | Donnees meteo | stat-card, chart |
| `cross-server` | Donnees multi-serveurs | table, chart, kv |

### Filtrage par serveur

```ts
const recipes = filterRecipesByServer(WEBMCP_RECIPES, ['tricoteuses']);
// Retourne les recettes dont servers contient "tricoteuses" + les universelles (servers: [])
```

### Injection dans le prompt

Les recettes sont injectees dans la section `## webmcp` du prompt :

```
### recettes UI (3)
- Composer un tableau de bord KPI: metriques numeriques [stat-card, chart, table, kv]
- Parlementaire profile: profil depute [profile, hemicycle, timeline]
```

Format compact : <500 tokens pour 5 recettes.

## Recettes MCP (serveur)

Les recettes MCP viennent du serveur via les outils `list_recipes` et `get_recipe`. Elles decrivent ce que les outils retournent.

### Type McpRecipe

```ts
interface McpRecipe {
  name: string;
  description?: string;
}
```

### Utilisation

```ts
const recipesResult = await client.callTool('list_recipes', {});
const mcpRecipes: McpRecipe[] = JSON.parse(recipesResult.content[0].text);

const mcpLayer: McpLayer = {
  source: 'mcp',
  serverUrl: 'https://mcp.code4code.eu/mcp',
  serverName: 'Tricoteuses',
  tools: await client.listTools(),
  recipes: mcpRecipes,
};
```

Elles apparaissent dans le prompt sous :

```
## mcp (Tricoteuses)
### recettes serveur (2)
- profil-depute: Fiche complete avec votes et mandats
- scrutin-detail: Analyse detaillee d'un scrutin public
```

### Detail via get_recipe

Le LLM voit les resumes dans le prompt. Quand il a besoin du detail, il appelle `get_recipe` (outil MCP du serveur) :

```
LLM -> get_recipe({ name: "profil-depute" })
    <- { body: "1. Appeler search_deputes(...)\n2. Appeler get_votes(...)\n..." }
```

C'est le serveur qui decide du contenu de `body` — workflow, exemples, parametres recommandes.

## WebMCP vs MCP : comparaison

| | Recette WebMCP (UI) | Recette MCP (serveur) |
|--|---------------------|----------------------|
| **Source** | Package agent (fichiers .md) | Serveur MCP (`list_recipes`) |
| **Contenu** | Comment presenter avec component() | Ce que les outils retournent, comment les combiner |
| **Section prompt** | `## webmcp > recettes UI` | `## mcp > recettes serveur` |
| **Type** | `Recipe` | `McpRecipe` |
| **Porte par** | `UILayer.recipes` | `McpLayer.recipes` |
| **Lazy loading** | `get_component("id")` ou `component("id")` | `get_recipe(name)` (outil MCP) |
| **Guide quoi** | Le **View** (comment afficher) | Le **Model/Data** (quoi demander) |
| **Body dans le prompt** | Non (resumes uniquement) | Non (resumes uniquement) |

### Deux axes complementaires

Les recettes WebMCP et MCP ne font pas la meme chose :

- **WebMCP** guide le "comment afficher" : quels composants utiliser, dans quel layout, avec quels parametres. C'est la couche **View**.
- **MCP** guide le "quoi demander" : quels outils appeler, dans quel ordre, avec quels parametres. C'est la couche **Model/Data**.

L'agent utilise les deux ensemble : une recette MCP lui dit comment obtenir les donnees, une recette WebMCP lui dit comment les presenter.
