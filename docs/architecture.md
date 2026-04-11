# Architecture

Structure monorepo, dependances entre packages, et decisions de design (Phase 8).

## Structure monorepo

```
webmcp-auto-ui/
 |
 +-- packages/
 |    +-- core/          W3C WebMCP polyfill + MCP client + WebMCP server factory
 |    +-- sdk/           HyperSkill format, skills CRUD, canvas store (Svelte 5)
 |    +-- agent/         LLM agent loop, 4 providers, ToolLayers, autoui server, recettes
 |    +-- ui/            34+ Svelte 5 components (primitives, widgets, WM)
 |
 +-- apps/
 |    +-- home/          Landing page, app launcher (port 5173)
 |    +-- flex2/         Flex -- canvas IA, ToolLayers, LogDrawer, RecipeModal
 |    +-- viewer2/       Viewer -- lecteur HyperSkills read-only avec CRUD, DAG, paste URI
 |    +-- showcase2/     Showcase -- demo dynamique avec agent + MCP + 3 themes
 |    +-- todo2/         Todo -- todo WebMCP, template minimal
 |    +-- recipes/       Recipes -- explorateur de recettes, layout 3 colonnes, chat input, test live
 |
 +-- docs/               Documentation
 +-- package.json        Root workspace config
```

## Graphe de dependances

```
                +----------+
                |   core   |  (zero deps, framework-agnostic)
                +----+-----+
                     |
              +------+------+
              |             |
         +----v----+   +----v----+
         |   sdk   |   |  agent  |
         +---------+   +---------+
              |
         (Svelte 5 runes)

         +---------+
         |   ui    |  (standalone -- pas de deps internes)
         +---------+
```

- **core** : zero dependances externes. TypeScript pur. Fournit `McpClient`, `createWebMcpServer`, `parseFrontmatter`.
- **sdk** : depend de Svelte 5 (peer) pour le canvas store. Fournit aussi un store vanilla a `@webmcp-auto-ui/sdk/canvas-vanilla`. Shippe `MCP_DEMO_SERVERS`.
- **agent** : depend de core (`McpClient`, `WebMcpServer`, types). 4 providers LLM. ToolLayers. `autoui` server pre-configure.
- **ui** : standalone. Peer deps : `svelte ^5`, `d3 ^7`, `leaflet >=1.9`.

## Les 2 protocoles symetriques

L'architecture repose sur deux protocoles symetriques :

| Protocole | Role | Transport | Exemple |
|-----------|------|-----------|---------|
| **MCP** | Donnees distantes (query, fetch) | Streamable HTTP (JSON-RPC 2.0) | `tricoteuses_mcp_search_recipes` |
| **WebMCP** | Affichage local (widgets, canvas) | In-process (JS) | `autoui_webmcp_widget_display` |

Les deux protocoles sont traites uniformement par les `ToolLayer[]`. Chaque layer porte un `protocol: 'mcp' | 'webmcp'` et un `serverName`.

```
+--------------------------------------------------+
|                    ToolLayer[]                     |
|                                                    |
|  +-- McpLayer (par serveur) ---+  +-- WebMcpLayer --+ |
|  |  protocol: 'mcp'           |  | protocol: 'webmcp' |
|  |  tools: McpToolDef[]       |  | tools: WebMcpToolDef[] |
|  |  recipes: McpRecipe[]      |  | (search_recipes, get_recipe, |
|  |  serverName, serverUrl     |  |  widget_display, canvas, recall) |
|  +-----------------------------+  +---------------------+ |
+--------------------------------------------------+
         |                               |
    buildSystemPrompt()          buildDiscoveryTools()
         |                      activateServerTools()
    Prompt structure:            AnthropicTool[]:
    SERVEURS CONNECTES           - {server}_{protocol}_{tool}
    STRATEGIE                    - Lazy loaded per server
```

### McpLayer

Un par serveur MCP connecte. Porte les outils DATA (query, fetch) et les recettes serveur.

```ts
interface McpLayer {
  protocol: 'mcp';
  serverName: string;
  description?: string;
  serverUrl?: string;
  tools: McpToolDef[];
  recipes?: McpRecipe[];
}
```

### WebMcpLayer

Un par serveur WebMCP (autoui built-in + serveurs custom). Porte les outils d'affichage.

```ts
interface WebMcpLayer {
  protocol: 'webmcp';
  serverName: string;
  description: string;
  tools: WebMcpToolDef[];
}
```

### Multi-serveurs WebMCP

Plusieurs serveurs WebMCP peuvent coexister. Le serveur `autoui` (built-in) fournit les 26 widgets natifs. Des serveurs custom peuvent ajouter des widgets supplementaires :

```ts
import { autoui } from '@webmcp-auto-ui/agent';
import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Built-in: 26 widgets natifs
const autouiLayer = autoui.layer();

// Custom: widgets metier
const designkit = createWebMcpServer('designkit', { description: 'Design system widgets' });
designkit.registerWidget(recipeMarkdown, CustomComponent);
const designkitLayer = designkit.layer();

// Les deux coexistent dans les layers
const layers = [mcpLayer, autouiLayer, designkitLayer];
```

## Tool naming convention

Tous les outils sont prefixes : `{serverName}_{protocol}_{toolName}`.

| Outil prefixe | Serveur | Protocole | Outil |
|--------------|---------|-----------|-------|
| `tricoteuses_mcp_query_sql` | tricoteuses | mcp | query_sql |
| `autoui_webmcp_widget_display` | autoui | webmcp | widget_display |
| `autoui_webmcp_search_recipes` | autoui | webmcp | search_recipes |
| `designkit_webmcp_widget_display` | designkit | webmcp | widget_display |

Le prefixe elimine les collisions entre serveurs et permet le routage automatique dans la boucle agent.

## Lazy loading des tools

Au demarrage, seuls les outils de decouverte sont envoyes au LLM :

1. `buildDiscoveryTools(layers)` — extrait `search_recipes`, `get_recipe` pour chaque serveur, plus les outils d'action WebMCP (`widget_display`, `canvas`, `recall`)
2. Quand le LLM appelle un outil d'un serveur, `activateServerTools()` charge tous les outils de ce serveur
3. Le budget tokens initial est minimal (~10 outils) meme avec de nombreux serveurs

## Pipeline des schemas

```
Composant Svelte (Props)
        |
        v
Recette (.md avec frontmatter YAML)
  - widget: nom
  - description: texte
  - schema: JSON Schema des props
  - body: instructions d'utilisation
        |
        v
WebMCP Server (createWebMcpServer)
  - registerWidget(recipe, renderer)
  - genere automatiquement: search_recipes, get_recipe, widget_display
        |
        v
ToolLayer (server.layer())
  - protocol: 'webmcp'
  - tools: WebMcpToolDef[]
        |
        v
Agent Loop (runAgentLoop)
  - buildDiscoveryTools → buildSystemPrompt → LLM
```

## Description des apps

| App | Chemin | Description |
|-----|--------|------------|
| **Home** | `apps/home/` | Landing page avec liens vers toutes les apps. Configurable via `PUBLIC_BASE_URL`. |
| **Flex** | `apps/flex2/` | Canvas IA avec ToolLayers, debug panel, badges provenance, mode composeur/consommateur, LogDrawer (AgentConsole), RecipeModal, export HyperSkill gzip. |
| **Viewer** | `apps/viewer2/` | Lecteur HyperSkills read-only avec CRUD, DAG de versions, paste URI. |
| **Showcase** | `apps/showcase2/` | Demo dynamique avec agent + MCP + 3 themes. |
| **Todo** | `apps/todo2/` | Todo WebMCP, template minimal avec architecture layers. |
| **Recipes** | `apps/recipes/` | Explorateur de recettes MCP + WebMCP, layout 3 colonnes, chat input, test live, sync recettes par serveur. |

## Stack technique

| Couche | Technologie |
|--------|-----------|
| Framework | SvelteKit (apps), Svelte 5 (composants) |
| Styling | Tailwind CSS 4 + CSS variables theming |
| UI base | bits-ui (shadcn-svelte pattern), tailwind-variants |
| Charting | D3.js v7 (Chart, Sankey, Hemicycle, D3Widget) |
| Maps | Leaflet (MapView) |
| LLM | Anthropic Claude API (via server proxy), Gemma 4 LiteRT (in-browser, OPFS), Ollama/Llamafile (local) |
| Protocol | MCP Streamable HTTP (JSON-RPC 2.0), WebMCP (in-process) |
| Build | TypeScript, svelte-package, Vite |

## Decisions de design

### Deux protocoles, une interface

MCP et WebMCP partagent le meme pattern : serveur avec outils, recettes, et decouverte. La seule difference est le transport (HTTP vs in-process). Les `ToolLayer[]` les unifient pour la boucle agent.

### Lazy loading par serveur

Les outils ne sont pas tous envoyes au LLM au premier tour. `buildDiscoveryTools()` fournit uniquement les outils de decouverte (search_recipes, get_recipe) + les outils d'action. Quand le LLM touche un serveur, `activateServerTools()` charge ses outils data. Cela economise le context window.

### Recettes dans les serveurs

Les recettes (fichiers .md avec frontmatter) sont enregistrees dans les serveurs WebMCP via `registerWidget()`. Le serveur genere automatiquement les outils `search_recipes` et `get_recipe`. Le LLM decouvre les widgets via ces outils, pas via un listing statique dans le prompt.

### CSS variables theming

Tokens (couleurs, radii, fonts) en CSS custom properties dans `ThemeProvider`. Deux modes built-in (`light`, `dark`) avec override complet via `theme.json` ou le canvas store.

### FONC message bus

Les composants ne s'appellent jamais directement. Le bus `bus` singleton implemente le principe "messaging not calling" d'Alan Kay.

### WidgetRenderer dispatch

`WidgetRenderer` recoit `{ type, data, servers? }` et dispatche vers le widget. Pipeline : **LLM -> widget_display -> store -> WidgetRenderer**. Resout d'abord dans les serveurs WebMCP custom, puis dans NATIVE_MAP.

### HyperSkill URL format

Skill serialisee en JSON -> base64 -> `?hs=`. Gzip au-dela de 6KB. SHA-256 pour tracabilite.

### LiteRT migration (v0.5.0)

Le provider Gemma WASM a migre de ONNX a LiteRT (`@mediapipe/tasks-genai` main thread). 2-4x plus rapide sur WebGPU. Cache OPFS.

### Vanilla canvas store

En plus du store Svelte 5 runes (`@webmcp-auto-ui/sdk/canvas`), un store vanilla framework-agnostic a `@webmcp-auto-ui/sdk/canvas-vanilla` pour React/Vue/vanilla.

### Agent loop architecture

`runAgentLoop` accepte des `layers` structures. Les outils sont routes via le prefixe `{server}_{protocol}_{tool}`. Les MCP tools vont au `McpClient`, les WebMCP tools vont au serveur correspondant. Arret sur `end_turn` ou `max_iterations`.
