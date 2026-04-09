# webmcp-auto-ui

A monorepo for building WEBMCP browser UIs that are composed dynamically by humans and LLMs connected to MCP servers.

## What it does

Connect an MCP server to any of the apps. An LLM reads the available tools and skills / recipes, fetches data, then calls `render_*` tools to assemble a UI from typed blocks — stat cards, tables, charts, timelines, etc. Each block auto-registers as a live WebMCP tool that agents can read and update dynamically.

The [HyperSkill](https://hyperskills.net/) format lets you snapshot the current UI as a portable URL (`?hs=base64`), share it, version it, and reload it later. Hyperskills can be shared on [Skillpedia](https://skillpedia.eu/)

## Packages

| Package | Description |
|---------|-------------|
| [`@webmcp-auto-ui/core`](./packages/core/README.md) | W3C WebMCP polyfill, MCP client, McpMultiClient, prompt caching, schema utils — pure TypeScript, zero dependencies |
| [`@webmcp-auto-ui/ui`](./packages/ui/README.md) | 34+ Svelte components: primitives, blocks, rich widgets, window manager layouts, agent UI |
| [`@webmcp-auto-ui/agent`](./packages/agent/README.md) | Agent loop, Remote LLM (Anthropic) and WASM (Gemma 4 LiteRT) providers, unified `component()` tool (56 components), TokenTracker |
| [`@webmcp-auto-ui/sdk`](./packages/sdk/README.md) | Skills CRUD, canvas state store (Svelte 5 + vanilla), MCP demo server registry, HyperSkills encoding with gzip (re-exported from [`hyperskills`](https://www.npmjs.com/package/hyperskills) NPM) |

## Demo Apps

| App | Port | Description |
|-----|------|-------------|
| `flex` | 5179 | Canvas drag & resize, multi-MCP, grid/float toggle, Gemma LiteRT, TokenBubble, HyperSkills export |
| `showcase` | 5177 | All 34+ components with mock data, RemoteMCPserversDemo, FlexLayout, any MCP server |
| `todo` | 5175 | TODO List editor — 8 WebMCP tools exposed to the browser extension |
| `viewer` | 5176 | Load and edit a HyperSkill URL, with diff and SHA-256 versioning |
| `home` | 5173 | Landing page |

## Getting started

```bash
# Apps with LLM chat need an API key in .env
# Copy the example and add your key (any LLM provider supported by the agent package)
cp .env.example apps/flex/.env

npm install
npm run dev        # all 5 apps in parallel
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
