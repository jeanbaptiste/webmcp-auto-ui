---
title: Architecture
description: Monorepo structure, package dependencies, and the 3-layer architecture (v0.8)
sidebar:
  order: 2
---

## Monorepo structure

```
webmcp-auto-ui/
 |
 +-- packages/
 |    +-- core/          W3C WebMCP polyfill + MCP Streamable HTTP client
 |    +-- sdk/           HyperSkill format, skills CRUD, canvas store (Svelte 5)
 |    +-- agent/         LLM agent loop, 4 providers, ToolLayers, recipes, component()
 |    +-- ui/            34+ Svelte 5 components (primitives, widgets, WM)
 |
 +-- apps/
 |    +-- home/          Landing page, app launcher (port 5173)
 |    +-- flex2/         Flex -- AI canvas, ToolLayers, component(), LogDrawer, RecipeModal
 |    +-- viewer2/       Viewer -- read-only HyperSkills reader with CRUD, DAG, paste URI
 |    +-- showcase2/     Showcase -- dynamic demo with agent + MCP + 3 themes
 |    +-- todo2/         Todo -- WebMCP todo, minimal template
 |    +-- recipes/       Recipes -- recipe explorer, 3-column layout, live testing
 |
 +-- docs/               Source documentation
 +-- docs-site/          Starlight site (this documentation)
 +-- package.json        Root workspace config
```

## Dependency graph

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
         |   ui    |  (standalone -- no internal deps)
         +---------+
```

- **core**: zero external dependencies. Pure TypeScript, framework-agnostic, SSR-safe.
- **sdk**: depends on Svelte 5 (peer) for the canvas store. Also provides a vanilla store at `@webmcp-auto-ui/sdk/canvas-vanilla`. Ships `MCP_DEMO_SERVERS`.
- **agent**: depends on core (`McpClient`, `sanitizeSchema`, types). 4 LLM providers. ToolLayers. Recipes. ComponentAdapter.
- **ui**: standalone. Peer deps: `svelte ^5`, `d3 ^7`, `leaflet >=1.9`.

## The 3 layers

The architecture structures tools into 3 layers via `ToolLayer[]`:

```
+--------------------------------------------------+
|                    ToolLayer[]                     |
|                                                    |
|  +-- McpLayer (per server) ----+  +-- UILayer --+ |
|  |  tools: MCP tools           |  | component() | |
|  |  recipes: MCP recipes       |  | adapter?    | |
|  |  serverName, serverUrl      |  | recipes: UI | |
|  +-----------------------------+  +-------------+ |
+--------------------------------------------------+
         |                               |
    buildSystemPrompt()          buildToolsFromLayers()
         |                               |
    Prompt structure:            AnthropicTool[]:
    ## mcp (servers)             - MCP tools
    ## webmcp                    - component() (smart)
                                 - or render_* (explicit)
```

### McpLayer

One per connected MCP server. Carries DATA tools (query, fetch) and server recipes (what the tools return).

### UILayer

One per app. Carries `component()`, the optional `ComponentAdapter` (to filter components in explicit mode), and WebMCP recipes (how to present data).

### Recipes

Two types of recipes coexist:

| Type | Source | Role | Prompt section |
|------|--------|------|---------------|
| **MCP Recipe** | Server (`list_recipes`) | Describes returned data | `## mcp > server recipes` |
| **WebMCP Recipe** | Agent package (.md files) | Guides UI presentation | `## webmcp > UI recipes` |

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit (apps), Svelte 5 (components) |
| Styling | Tailwind CSS 4 + CSS variables theming |
| UI base | bits-ui (shadcn-svelte pattern), tailwind-variants |
| Charting | D3.js v7 (Chart, Sankey, Hemicycle, D3Widget) |
| Maps | Leaflet (MapView) |
| LLM | Anthropic Claude API (via server proxy), Gemma 4 LiteRT (in-browser, OPFS), Ollama/Llamafile (local) |
| Protocol | MCP Streamable HTTP (JSON-RPC 2.0) |
| Build | TypeScript, svelte-package, Vite |

## Design decisions

### Smart vs explicit mode

Smart mode (default) exposes a single `component()` tool to the LLM. The LLM discovers components via `component("help")` and renders via `component("name", {params})`. This saves ~2800 schema tokens compared to explicit mode (31 individual render_* tools).

### ComponentAdapter

Decouples tool definitions (what the LLM sees) from renderers (what the user sees). Apps register only the components they need via presets (`minimalPreset`, `nativePreset`, `allNativePreset`).

### CSS variables theming

Tokens (colors, radii, fonts) as CSS custom properties in `ThemeProvider`. Two built-in modes (`light`, `dark`) with full override via `theme.json` or the canvas store. 11 tokens cover all needs.

### FONC message bus

Components never call each other directly. The `bus` singleton implements Alan Kay's "messaging not calling" principle.

### BlockRenderer dispatch

`BlockRenderer` receives `{ type, data }` and dispatches to the widget. Pipeline: **LLM -> tool call -> block -> store -> renderer**.

### HyperSkill URL format

Skill serialized as JSON -> base64 -> `?hs=`. Gzip beyond 6KB. SHA-256 for traceability.
