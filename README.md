# webmcp-auto-ui

A monorepo for building WEBMCP browser UIs that are composed dynamically by humans and LLMs connected to MCP servers.

## What it does

Connect an MCP server to any of the apps. An LLM reads the available tools and skills / recipes, fetches data, then calls `render_*` tools to assemble a UI from typed blocks — stat cards, tables, charts, timelines, etc. Each block auto-registers as a live WebMCP tool that agents can read and update dynamically.

The [HyperSkill](https://hyperskills.net/) format lets you snapshot the current UI as a portable URL (`?hs=base64`), share it, version it, and reload it later. Hyperskills can be shared on [Skillpedia](https://skillpedia.eu/)

## Packages

| Package | Description |
|---------|-------------|
| [`@webmcp-auto-ui/core`](./packages/core/README.md) | W3C WebMCP polyfill, MCP client, McpMultiClient, schema utils — pure TypeScript, zero dependencies |
| [`@webmcp-auto-ui/ui`](./packages/ui/README.md) | 32 Svelte components: primitives, blocks, rich widgets, window manager layouts |
| [`@webmcp-auto-ui/agent`](./packages/agent/README.md) | Agent loop, Remote LLM and WASM providers |
| [`@webmcp-auto-ui/sdk`](./packages/sdk/README.md) | Skills CRUD, canvas state store, HyperSkills encoding (re-exported from [`hyperskills`](https://www.npmjs.com/package/hyperskills) NPM) |

## Apps

| App | Port | Description |
|-----|------|-------------|
| `flex` | 5179 | Canvas drag & resize, multi-MCP (7 serveurs), chat éphémère, HyperSkills export |
| `template` | 5180 | Starter SvelteKit avec tous les composants natifs prêts à l'emploi |
| `showcase` | 5177 | All 32 components with iNaturalist mock data + any MCP server |
| `todo` | 5175 | TODO List editor — 8 WebMCP tools exposed to the browser extension |
| `composer` | 5174 | UI composer — auto, drag & drop, or chat |
| `viewer` | 5176 | Load and edit a HyperSkill URL, with diff and SHA-256 versioning |
| `mobile` | 5178 | Phone-frame UI with real MCP, Gemma E2B, and skills management |
| `home` | 5173 | Landing page |

## MCP Servers

7 MCP servers are available for demos:

| Server | URL |
|--------|-----|
| Code4Code | `https://mcp.code4code.eu/mcp` |
| Hacker News | `https://demos.hyperskills.net/mcp-hackernews/mcp` |
| Met Museum | `https://demos.hyperskills.net/mcp-metmuseum/mcp` |
| Open-Meteo | `https://demos.hyperskills.net/mcp-openmeteo/mcp` |
| Wikipedia | `https://demos.hyperskills.net/mcp-wikipedia/mcp` |
| iNaturalist | `https://demos.hyperskills.net/mcp-inaturalist/mcp` |
| data.gouv.fr | `https://demos.hyperskills.net/mcp-datagouv/mcp` |

## Getting started

```bash
# Required for apps with LLM chat
echo "ANTHROPIC_API_KEY=sk-ant-..." > apps/flex/.env
echo "ANTHROPIC_API_KEY=sk-ant-..." > apps/composer/.env
echo "ANTHROPIC_API_KEY=sk-ant-..." > apps/template/.env

npm install
npm run dev        # all 8 apps in parallel
npm run dev:flex   # single app
npm test           # vitest
```

## WebMCP browser extension

1. Chrome 146+ — enable `chrome://flags/#enable-webmcp-testing`
2. Install [Model Context Tool Inspector](https://chromewebstore.google.com/)
3. Open any app — tools registered by the page appear in the extension

## HyperSkill URL format

```
https://example.com?hs=base64(skill)
```

Skills above 6 KB are gzip-compressed (`gz.` prefix). Each version carries a SHA-256 hash of `source_url + content`, chainable for traceability. The format is defined at [hyperskills.net](https://hyperskills.net/).

## License

AGPL-3.0-or-later - Copyright CERI SAS
