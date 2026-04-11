# Architecture MCP / WebMCP

Guide complet pour comprendre comment MCP et WebMCP coexistent dans
webmcp-auto-ui, et comment la boucle agent les orchestre de maniere
transparente.

---

## 1. Les deux protocoles

Le systeme repose sur deux protocoles symetriques :

- **MCP** (Model Context Protocol) fournit les **donnees distantes** --
  requetes SQL, API REST, scraping, etc.
- **WebMCP** fournit l'**affichage local** -- widgets, canvas, interactions
  navigateur.

Chacun expose des **tools** (actions atomiques) et des **recettes**
(guides de composition).

### Tableau comparatif

| Dimension       | MCP                            | WebMCP                          |
|-----------------|--------------------------------|---------------------------------|
| Role            | Donnees, API, bases            | Affichage, interaction          |
| Transport       | HTTP Streamable / stdio        | Appels JS in-process            |
| Execution       | Serveur distant                | Navigateur local                |
| Latence         | Reseau (50-500ms)              | Instantane (<1ms)               |
| Exemples tools  | query_sql, fetch_document      | widget_display, canvas          |
| Recettes        | Decrivent les donnees          | Decrivent la presentation       |
| Package         | `@webmcp-auto-ui/core`         | `@webmcp-auto-ui/core`         |

---

## 2. La symetrie

Le design fondamental est la **symetrie** : le LLM ne distingue pas un
tool MCP d'un tool WebMCP. Les deux protocols exposent la meme interface :

- `search_recipes()` -- decouvrir les recettes disponibles
- `get_recipe()` -- obtenir le schema et les instructions
- Des tools specifiques -- executer des actions

Du point de vue du LLM, un appel MCP et un appel WebMCP suivent le meme
cycle : decouverte, lecture du schema, execution. Seul le routage interne
differe -- la boucle agent dispatche vers le bon serveur selon le prefixe.

```
             LLM
              |
     +--------+--------+
     |                  |
  *_mcp_*           *_webmcp_*
     |                  |
  McpClient         WebMcpServer
  (HTTP)            (JS local)
     |                  |
  Serveur            Navigateur
  distant            (widgets)
```

---

## 3. Le prefixage uniforme

Tous les tools suivent la convention de nommage :

```
{serverName}_{protocol}_{toolName}
```

Exemples concrets avec plusieurs serveurs connectes :

| Tool prefixe complet                        | serverName    | protocol | toolName        |
|---------------------------------------------|---------------|----------|-----------------|
| `tricoteuses_mcp_query_sql`                 | tricoteuses   | mcp      | query_sql       |
| `tricoteuses_mcp_search_recipes`            | tricoteuses   | mcp      | search_recipes  |
| `datagouv_mcp_fetch_dataset`                | datagouv      | mcp      | fetch_dataset   |
| `autoui_webmcp_widget_display`              | autoui        | webmcp   | widget_display  |
| `autoui_webmcp_search_recipes`              | autoui        | webmcp   | search_recipes  |
| `designkit_webmcp_widget_display`           | designkit     | webmcp   | widget_display  |

Le routage dans la boucle agent parse ce prefixe avec une regex :

```
/^(.+?)_(mcp|webmcp)_(.+)$/
```

Puis dispatche :
- `protocol === 'mcp'` --> `McpClient.callTool(toolName, params)`
- `protocol === 'webmcp'` --> `WebMcpServer.executeTool(toolName, params)`

Ce prefixage garantit qu'il n'y a **aucune collision de noms** meme avec
10 serveurs connectes simultanement.

---

## 4. Le lazy loading

Au demarrage, la boucle agent n'expose **pas** tous les tools de tous
les serveurs. Elle ne fournit que les tools de decouverte :

| Protocol | Tools exposes au depart                              |
|----------|------------------------------------------------------|
| MCP      | `search_recipes`, `get_recipe`                       |
| WebMCP   | `search_recipes`, `get_recipe`, `widget_display`,    |
|          | `canvas`, `recall`                                   |

Les tools WebMCP d'action (`widget_display`, `canvas`, `recall`) sont
toujours presents car ils sont necessaires pour afficher des resultats.

### Timeline du lazy loading

```
Iteration 1     Iteration 2       Iteration 3        Iteration 4
    |               |                 |                  |
    v               v                 v                  v

[discovery]    [activation]      [data tools]       [display]
                                                         
Tools:          Tools:             Tools:             Tools:
  tricoX_mcp_     tricoX_mcp_       tricoX_mcp_       tricoX_mcp_
  search_recipes  search_recipes    search_recipes    search_recipes
  get_recipe      get_recipe        get_recipe        get_recipe
                  query_sql    <--  query_sql         query_sql
                  fetch_doc         fetch_doc         fetch_doc
                  list_tables       list_tables       list_tables
                                                         
  autoui_webmcp_  autoui_webmcp_    autoui_webmcp_    autoui_webmcp_
  search_recipes  search_recipes    search_recipes    search_recipes
  get_recipe      get_recipe        get_recipe        get_recipe
  widget_display  widget_display    widget_display    widget_display
                                                         
LLM appelle:   LLM appelle:      LLM appelle:      LLM appelle:
search_recipes query_sql         get_recipe        widget_display
               (active le        (charge le        (rendu final)
                serveur)         schema widget)
```

Quand le LLM appelle un tool d'un serveur pour la premiere fois,
`activateServerTools()` ajoute tous les tools de ce serveur au jeu actif.
Le serveur n'est active qu'une seule fois.

### Economie de tokens

Avec 4 serveurs et 50 tools au total, le mode discovery expose ~20 tools
au lieu de 50. Cela represente une economie d'environ 3000-5000 tokens
dans le prompt initial -- significatif quand le budget est de 8K tokens
par tour.

---

## 5. Le system prompt dynamique

`buildSystemPrompt(layers)` genere un prompt adapte aux serveurs
connectes. Le prompt contient trois sections :

1. **SERVEURS CONNECTES** -- liste chaque serveur avec son protocol
2. **STRATEGIE** -- ordre des operations (recettes, donnees, affichage)
3. **Contraintes** -- regles (pas d'URLs inventees, etc.)

### Exemple de prompt genere

Avec 2 serveurs MCP (tricoteuses, datagouv) et 1 serveur WebMCP (autoui) :

```
Tu es un assistant UI.

SERVEURS CONNECTES :
- tricoteuses (mcp) : API parlementaire francaise
- datagouv (mcp) : Open data gouv.fr
- autoui (webmcp) : serveur d'affichage

STRATEGIE :
1. Recettes d'abord : tricoteuses_mcp_search_recipes(),
   datagouv_mcp_search_recipes(), autoui_webmcp_search_recipes()
2. Donnees : les outils *_mcp_* du bon serveur
3. Affichage : les outils *_webmcp_widget_display() du bon serveur

Ne fabrique jamais d'URLs d'images -- utilise uniquement celles
retournees par les outils.
```

### Personnalisation par app

Les apps peuvent passer un `systemPrompt` custom dans les options de
`runAgentLoop()`. Quand il est fourni, il remplace le prompt genere.
Les apps ajoutent typiquement des instructions specifiques a leur
domaine (mode compositeur, contraintes de layout, etc.).

---

## 6. Le pipeline de schemas

Les schemas des widgets suivent un pipeline en 4 etapes, du composant
Svelte au runtime :

```
+-------------------+     +------------------+     +-------------------+
| Composant Svelte  |     |  Script          |     |  Recette .md      |
| (interface Props) | --> | sync-schemas.ts  | --> | (frontmatter YAML)|
|                   |     |                  |     |                   |
| interface Props { |     | - Parse TS       |     | ---               |
|   label: string;  |     | - Extract Props  |     | widget: stat      |
|   value: string;  |     | - Convert to     |     | schema:           |
|   trend?: string; |     |   JSON Schema    |     |   type: object    |
| }                 |     | - Inject into    |     |   required:       |
|                   |     |   frontmatter    |     |     - label       |
+-------------------+     +------------------+     |     - value       |
                                                   |   properties:     |
                                                   |     label:        |
                                                   |       type: string|
                                                   | ---               |
                                                   | ## Quand utiliser |
                                                   | ...               |
                                                   +--------+----------+
                                                            |
                                                            v
                                                   +-------------------+
                                                   | WebMCP Server     |
                                                   | (runtime)         |
                                                   |                   |
                                                   | registerWidget()  |
                                                   | - parse front.    |
                                                   | - extract schema  |
                                                   | - build tools     |
                                                   | - validate params |
                                                   +-------------------+
```

Le script `sync-schemas.ts` maintient un mapping explicite entre chaque
nom de widget et son fichier `.svelte` (ex: `"stat"` <--> `StatBlock.svelte`,
`"profile"` <--> `ProfileCard.svelte`). Les schemas restent a jour via
`npm run docs:sync` (mode `--check` en CI).

### Validation au runtime

Quand le LLM appelle `widget_display(name, params)`, le serveur WebMCP
valide les params contre le JSON Schema **avant** de les passer au
renderer. Si la validation echoue, le LLM recoit un message d'erreur
avec le schema attendu, ce qui lui permet de corriger son appel.

---

## 7. Le flow complet d'une conversation

Sequence diagram d'une conversation typique. L'utilisateur demande :
"Montre-moi le profil du depute Jean Dupont".

```
User            LLM              Agent Loop         MCP Server       WebMCP Server
 |               |                  |                  |                 |
 |  "Profil de   |                  |                  |                 |
 |   Jean Dupont"|                  |                  |                 |
 |-------------->|                  |                  |                 |
 |               |                  |                  |                 |
 |               |  [Iteration 1 - Discovery]          |                 |
 |               |  tricoteuses_mcp_                   |                 |
 |               |  search_recipes("profil")           |                 |
 |               |----------------->|                  |                 |
 |               |                  |  callTool()      |                 |
 |               |                  |----------------->|                 |
 |               |                  |  [{name: "parl.  |                 |
 |               |                  |    -profile",    |                 |
 |               |                  |    desc: "..."}] |                 |
 |               |                  |<-----------------|                 |
 |               |                  |                  |                 |
 |               |  activateServerTools(tricoteuses)   |                 |
 |               |  --> tous les tools MCP actifs      |                 |
 |               |                  |                  |                 |
 |               |<-----------------|                  |                 |
 |               |                  |                  |                 |
 |               |  [Iteration 2 - Data]               |                 |
 |               |  tricoteuses_mcp_                   |                 |
 |               |  query_sql("SELECT ... depute")     |                 |
 |               |----------------->|                  |                 |
 |               |                  |  callTool()      |                 |
 |               |                  |----------------->|                 |
 |               |                  |  {nom: "Dupont", |                 |
 |               |                  |   groupe: "RE",  |                 |
 |               |                  |   photo: "..."}  |                 |
 |               |                  |<-----------------|                 |
 |               |<-----------------|                  |                 |
 |               |                  |                  |                 |
 |               |  [Iteration 3 - Schema]             |                 |
 |               |  autoui_webmcp_                     |                 |
 |               |  get_recipe("profile")              |                 |
 |               |----------------->|                  |                 |
 |               |                  |  executeTool()   |                 |
 |               |                  |---------------------------------->|
 |               |                  |  {schema: {...}, |                 |
 |               |                  |   recipe: "..."}|                 |
 |               |                  |<----------------------------------|
 |               |<-----------------|                  |                 |
 |               |                  |                  |                 |
 |               |  [Iteration 4 - Display]            |                 |
 |               |  autoui_webmcp_                     |                 |
 |               |  widget_display("profile",          |                 |
 |               |    {name:"J. Dupont",               |                 |
 |               |     subtitle:"Depute RE",           |                 |
 |               |     avatar:"https://..."})          |                 |
 |               |----------------->|                  |                 |
 |               |                  |  executeTool()   |                 |
 |               |                  |---------------------------------->|
 |               |                  |  1. Validate vs  |                 |
 |               |                  |     JSON Schema  |                 |
 |               |                  |  2. Return       |                 |
 |               |                  |     {widget,data}|                 |
 |               |                  |<----------------------------------|
 |               |                  |                  |                 |
 |               |                  |  onWidget()      |                 |
 |               |                  |  --> BlockRenderer                 |
 |               |                  |  --> ProfileCard  |                 |
 |               |                  |                  |                 |
 |               |<-----------------|                  |                 |
 |               |  "Voici le       |                  |                 |
 |               |   profil de..."  |                  |                 |
 |<--------------|                  |                  |                 |
 |               |                  |                  |                 |
 | [ProfileCard rendu dans le canvas]                  |                 |
```

### Mecanismes de securite

Deux garde-fous evitent les boucles infinies :

1. **Compteur d'iterations sans rendu** -- apres 4 iterations sans
   `widget_display`, les tools de discovery sont retires du jeu actif.
   Apres 5 iterations, un message de nudge est injecte.

2. **`max_iterations`** (defaut 5) -- la boucle s'arrete meme si le
   LLM n'a pas termine.

### Compression des resultats

Apres chaque iteration, les anciens `tool_result` sont comprimes :
les textes de plus de 300 caracteres sont tronques a 200 avec un hint
`recall('id')`. Le LLM peut recuperer le resultat complet via l'outil
`recall`.

---

## 8. Multi-serveurs

Plusieurs serveurs MCP et WebMCP coexistent grace au prefixage uniforme.
Voici un exemple avec 4 serveurs :

```
+-------------------------------------------------------------------+
|                        Agent Loop                                 |
|                                                                   |
|  layers: ToolLayer[]                                              |
|                                                                   |
|  +---------------------------+  +---------------------------+     |
|  | McpLayer                  |  | McpLayer                  |     |
|  | serverName: "tricoteuses" |  | serverName: "datagouv"    |     |
|  | protocol: "mcp"           |  | protocol: "mcp"           |     |
|  | tools:                    |  | tools:                    |     |
|  |   query_sql               |  |   fetch_dataset           |     |
|  |   search_recipes          |  |   search_recipes          |     |
|  |   get_recipe              |  |   get_recipe              |     |
|  |   fetch_document          |  |   list_datasets           |     |
|  +---------------------------+  +---------------------------+     |
|                                                                   |
|  +---------------------------+  +---------------------------+     |
|  | WebMcpLayer               |  | WebMcpLayer               |     |
|  | serverName: "autoui"      |  | serverName: "designkit"   |     |
|  | protocol: "webmcp"        |  | protocol: "webmcp"        |     |
|  | tools:                    |  | tools:                    |     |
|  |   search_recipes          |  |   search_recipes          |     |
|  |   get_recipe              |  |   get_recipe              |     |
|  |   widget_display          |  |   widget_display          |     |
|  |   canvas                  |  |                           |     |
|  |   recall                  |  |                           |     |
|  +---------------------------+  +---------------------------+     |
|                                                                   |
|  buildSystemPrompt(layers) --> prompt avec 4 serveurs             |
|  buildDiscoveryTools(layers) --> 8 search/get tools + 3 actions   |
|  activateServerTools() --> ajoute les tools d'un serveur          |
|                                                                   |
+-----+----------------------------+-------------------------------+
      |                            |
      v                            v
  McpClient                    WebMcpServer(s)
  (HTTP vers                   (JS local,
   tricoteuses,                 autoui + designkit)
   datagouv)
```

### Recettes multi-serveurs

Les recettes sont filtrees par serveur connecte. Quand le systeme
decouvre les serveurs actifs, `filterRecipesByServer()` selectionne les
recettes pertinentes. Le systeme gere aussi des **alias** : le serveur
"tricoteuses" matche les recettes qui referencent "moulineuse" ou
"code4code" (memes donnees, noms differents).

### Isolation des namespaces

Chaque serveur est un namespace complet. Si `autoui` et `designkit`
exposent tous les deux un tool `widget_display`, le LLM voit :

- `autoui_webmcp_widget_display` -- widgets standards (stat, chart, map...)
- `designkit_webmcp_widget_display` -- widgets design (mockup, wireframe...)

Pas de confusion possible. Le LLM choisit le bon serveur en fonction
des donnees et du contexte.

---

## 9. Extensibilite future

L'architecture par layers est concu pour accueillir de nouveaux types
de serveurs sans modifier la boucle agent.

### Browser WebMCP

Un serveur WebMCP `browser` pourrait exposer `notify`, `clipboard`,
`share`, `download`. Le LLM appellerait `browser_webmcp_notify(...)` de
la meme facon qu'il appelle `autoui_webmcp_widget_display(...)`.

### Native WebMCP (SwiftUI bridge)

Un bridge natif pourrait exposer `widget_display` (rendu SwiftUI),
`haptic`, `speech`. Meme convention de nommage : `native_webmcp_*`.

### Nouveaux protocols

`ToolLayer` est un union discrimine par `protocol`. Ajouter un troisieme
type (gRPC, WASM) = nouveau membre d'union + un cas dans
`buildToolsFromLayers()`.

```typescript
// Aujourd'hui
export type ToolLayer = McpLayer | WebMcpLayer;
// Demain
export type ToolLayer = McpLayer | WebMcpLayer | WasmLayer;
```

---

## Architecture globale -- Vue d'ensemble

```
+=========================================================================+
|                              NAVIGATEUR                                 |
|                                                                         |
|  +------------------+    +------------------+    +-------------------+  |
|  | App (SvelteKit)  |    | Agent Loop       |    | BlockRenderer     |  |
|  |                  |    |                  |    |                   |  |
|  | - Chat input     |--->| - LLM provider   |--->| Dispatch:         |  |
|  | - Config LLM     |    | - Tool dispatch  |    |   type -> widget  |  |
|  | - Canvas         |<---| - Lazy loading   |<---|   data -> props   |  |
|  |                  |    | - Compression    |    |                   |  |
|  +------------------+    +--------+---------+    +---+----------+----+  |
|                                   |                  |          |       |
|              +--------------------+---+              |          |       |
|              |                        |         StatBlock  ProfileCard  |
|              v                        v         ChartBlock MapView ...  |
|  +-----------+-------+  +------------+------+                           |
|  | WebMCP Server(s)  |  | LLM Provider      |                          |
|  | (autoui,designkit)|  | (Remote/Wasm/Local)|                          |
|  |                   |  |                    |                          |
|  | - search_recipes  |  | - chat()           |                          |
|  | - get_recipe      |  | - streaming        |                          |
|  | - widget_display  |  | - token tracking   |                          |
|  | - canvas/recall   |  +--------+-----------+                          |
|  +-------------------+           |                                      |
|                                  |  HTTP (Remote)                       |
+==========+=======================|======================================+
           |                       |
           |  MCP Streamable HTTP  |
           |  (JSON-RPC 2.0)      v
           |                                                               
+----------+-----------+  +-------------------+                            
| MCP Server           |  | LLM API           |                            
| (tricoteuses,        |  | (Claude, Ollama)  |                            
|  datagouv, ...)      |  |                   |                            
|                      |  +-------------------+                            
| - query_sql          |                                                   
| - search_recipes     |                                                   
| - get_recipe         |                                                   
| - fetch_document     |                                                   
+----------------------+                                                   
```

---

## Resume

| Concept                | Implementation                                |
|------------------------|-----------------------------------------------|
| Protocoles             | MCP (distant) + WebMCP (local), symetriques   |
| Prefixage              | `{server}_{protocol}_{tool}`                  |
| Layers                 | `McpLayer[]` + `WebMcpLayer[]` = `ToolLayer[]`|
| Lazy loading           | `buildDiscoveryTools()` + `activateServerTools()` |
| System prompt          | `buildSystemPrompt(layers)` -- dynamique      |
| Pipeline schemas       | Props TS -> sync-schemas -> .md -> WebMCP     |
| Validation             | JSON Schema au runtime avant rendu            |
| Multi-serveurs         | Namespaces isoles, alias, filtrage recettes    |
| Compression contexte   | Troncature + recall() pour long results       |
| Extensibilite          | Union discriminee `ToolLayer`, nouveau type    |
