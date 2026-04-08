# Architecture

Monorepo structure, package dependencies, and key design decisions.

## Monorepo layout

```
webmcp-auto-ui/
 |
 +-- packages/
 |    +-- core/          W3C WebMCP polyfill + MCP Streamable HTTP client
 |    +-- sdk/           HyperSkill format, skills CRUD, canvas store (Svelte 5)
 |    +-- agent/         LLM agent loop, Anthropic + Gemma providers, UI tools
 |    +-- ui/            34+ Svelte 5 components (primitives, widgets, WM)
 |
 +-- apps/
 |    +-- home/          Landing page, app launcher (port 5173)
 |    +-- todo/          MCP-powered todo demo (port 5175)
 |    +-- viewer/        HyperSkill URL renderer (port 5176)
 |    +-- showcase/      Component showcase + WebMCP tool demos (port 5177)
 |    +-- flex/          Canvas drag & resize, multi-MCP, chat (port 5179)
 |
 +-- docs/               Documentation
 +-- package.json        Root workspace config
```

## Package dependency graph

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
         |   ui    |  (standalone — no internal deps)
         +---------+
```

- **core** has zero external dependencies. Pure TypeScript.
- **sdk** depends on Svelte 5 (peer) for the canvas store. No dependency on core.
- **agent** depends on core (`@webmcp-auto-ui/core`) for `McpClient`, `sanitizeSchema`, and types.
- **ui** is standalone. Peer dependencies: `svelte ^5`, `d3 ^7`, `leaflet >=1.9`.

## App descriptions

| App | Purpose |
|-----|---------|
| **home** | Landing page with links to all other apps. Configurable via `PUBLIC_BASE_URL`. |
| **flex** | Canvas drag & resize, multi-MCP, ephemeral chat, HyperSkills export, Gemma WASM local. The most complete demo. |
| **todo** | Minimal todo app demonstrating MCP tool integration for CRUD operations. |
| **viewer** | Decodes a HyperSkill URL (`?hs=...`) and renders the embedded skill read-only. |
| **showcase** | Interactive catalog of all UI components. Also demonstrates WebMCP tool registration and postMessage bridge. |

## Technology stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit (apps), Svelte 5 (components) |
| Styling | Tailwind CSS 4 + CSS variables theming |
| UI base | bits-ui (shadcn-svelte pattern), tailwind-variants |
| Charting | D3.js v7 (Chart, Sankey, Hemicycle, D3Widget) |
| Maps | Leaflet (MapView) |
| LLM | Anthropic Claude API (via server proxy), Gemma E2B (in-browser worker) |
| Protocol | MCP Streamable HTTP (JSON-RPC 2.0) |
| Build | TypeScript, svelte-package, Vite |

## Key design decisions

### CSS variables theming

Theme tokens (colors, radii, fonts) are defined as CSS custom properties in `ThemeProvider`. Two built-in modes (`light`, `dark`) with full override support via `theme.json` or the canvas store's `themeOverrides`. Components read tokens from CSS variables, making theming work without recompilation.

### FONC message bus

Components never call each other directly. The `bus` singleton implements Alan Kay's "messaging not calling" principle: components register on named channels and exchange `BusMessage` objects. This decouples senders from receivers and enables composition without tight coupling.

### BlockRenderer dispatch

`BlockRenderer` is a single Svelte component that takes a `{ type, data }` block and dispatches rendering to the correct widget. The agent loop emits blocks via callbacks; the canvas store holds them; `BlockRenderer` renders them. This creates a clean pipeline: **LLM -> tool call -> block -> store -> renderer**.

### HyperSkill URL format

A skill (blocks + MCP URL + LLM choice + theme) is serialized to JSON, base64-encoded, and appended as `?hs=...` query parameter. Skills larger than 6KB are gzip-compressed (prefix `gz.`). Each version carries a SHA-256 hash for traceability and chaining.

### Agent loop architecture

The agent loop (`runAgentLoop`) runs an iterative LLM -> tool call -> LLM cycle. UI tools (`render_*`) are executed locally via callbacks (no MCP roundtrip). Data tools are forwarded to the MCP server via `McpClient.callTool()`. The loop stops on `end_turn` or `max_iterations`.
