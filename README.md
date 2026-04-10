# webmcp-auto-ui

Dynamic UI composition by humans and LLMs connected to multiple MCP servers.

An agent (Claude or Gemma WASM) reads available tools and recipes from MCP + WebMCP servers, fetches data, and assembles typed UI blocks (stat cards, tables, charts, timelines, etc.). Each block is exposed as a live WebMCP tool that agents can read and update. The system implements [HyperSkills](https://hyperskills.net/) for portable, versionable UI snapshots (`?hs=gzip.base64`).

## Packages

| Package | Description |
|---------|-------------|
| [`@webmcp-auto-ui/agent`](./packages/agent/README.md) | Agent loop, providers (Claude / Gemma 4 WASM), 5 internal tools (`list_components`, `get_component`, `component`, `recall`), ToolLayers, recipes, coercion, ComponentAdapter |
| [`@webmcp-auto-ui/core`](./packages/core/README.md) | MCP client, McpMultiClient, utilities |
| [`@webmcp-auto-ui/sdk`](./packages/sdk/README.md) | Canvas store (Svelte 5 + vanilla), HyperSkills encode/decode/hash/diff, Skills registry, MCP demo servers |
| [`@webmcp-auto-ui/ui`](./packages/ui/README.md) | 31 Svelte 5 components (blocks, widgets, layouts), extensible BlockRenderer, AgentConsole, ThemeProvider |

## Apps

| App | Port | Description |
|-----|------|-------------|
| `home` | static | Landing page with links to demos |
| `flex2` | 3007 | Full UI composer: agent chat, multi-MCP, canvas drag/resize, smart/explicit mode, debug panel, provenance badges, composer/consumer mode |
| `viewer2` | 3008 | HyperSkills reader: paste URI, CRUD blocks, DAG versions, export |
| `recipes` | 3009 | MCP + WebMCP recipe explorer with live agent testing |
| `showcase2` | 3010 | Dynamic demo: all components with 3 themes, or agent-driven generation from an MCP server |
| `todo2` | static | Minimal WebMCP todo |

## Architecture

- **ToolLayers** -- McpLayer (MCP tools) + UILayer (render tools), composed per agent call
- **Smart mode** -- 3 abstract tools (`list_components`, `get_component`, `component`) with lazy loading via `recall()`
- **Explicit mode** -- 31 concrete `render_*` tools, one per component
- **Recipes** -- WebMCP recipes (`.md` files) + MCP recipes (served via `list_recipes`/`get_recipe`)
- **Coercion** -- automatic parameter coercion in `executeUITool`
- **Compression** -- old tool results compressed to save context window
- **WasmProvider** -- Gemma 4 LiteRT running in-browser via Web Worker, native `<|tool_call|>` format

## Getting started

```bash
npm install

# Copy .env.example to .env and add your ANTHROPIC_API_KEY
cp .env.example .env

# Development
npm run dev:flex2    # single app (recommended)
npm run dev          # all apps

# Tests
npm test

# Production deploy
./scripts/deploy.sh          # all apps
./scripts/deploy.sh flex2    # single app
```

## Documentation

- Site: https://jeanbaptiste.github.io/webmcp-auto-ui/ (40+ pages, FR + EN)
- Demos: https://demos.hyperskills.net/
- GitHub: https://github.com/jeanbaptiste/webmcp-auto-ui
- NPM: `@webmcp-auto-ui/agent`, `core`, `sdk`, `ui`

## WebMCP browser extension

1. Chrome 146+ -- enable `chrome://flags/#enable-webmcp-testing`
2. Install [Model Context Tool Inspector](https://chromewebstore.google.com/)
3. Open any app -- tools registered by the page appear in the extension

## HyperSkills format

```
https://example.com?hs=gz.base64(skill)
```

Skills are gzip-compressed and appended to their source URL. Each version carries a SHA-256 hash of `source_url + content`, chainable for traceability. Defined at [hyperskills.net](https://hyperskills.net/) and available as [an NPM package](https://www.npmjs.com/package/hyperskills).

## License

AGPL-3.0-or-later - Copyright CERI SAS
