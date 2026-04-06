# webmcp-auto-ui

A monorepo for building browser UIs that are composed dynamically by LLMs connected to MCP servers.

![Architecture](./diagram.svg)

## What it does

Connect an MCP server to any of the apps. An LLM reads the available tools, fetches data, then calls `render_*` tools to assemble a UI from typed blocks — stat cards, tables, charts, timelines, etc. Each block auto-registers as a live WebMCP tool that agents can read and update.

The [HyperSkill](https://hyperskills.net/) format lets you snapshot the current UI as a portable URL (`?hs=base64`), share it, version it, and reload it later.

## Packages

| Package | Description |
|---------|-------------|
| [`@webmcp-auto-ui/core`](./packages/core/README.md) | W3C WebMCP polyfill, MCP client, schema utils — pure TypeScript, zero dependencies |
| [`@webmcp-auto-ui/ui`](./packages/ui/README.md) | 32 Svelte 5 components: primitives, blocks, rich widgets, window manager layouts |
| [`@webmcp-auto-ui/agent`](./packages/agent/README.md) | Agent loop, Anthropic and Gemma E2B providers, 19 `render_*` UI tools |
| [`@webmcp-auto-ui/sdk`](./packages/sdk/README.md) | HyperSkill encode/decode, skills CRUD, canvas state store |

## Apps

| App | Port | Description |
|-----|------|-------------|
| `home` | 5173 | Landing page |
| `composer` | 5174 | UI composer — auto, drag & drop, or chat |
| `todo` | 5175 | WebMCP demo — 8 tools exposed to the browser extension |
| `viewer` | 5176 | Load and edit a HyperSkill URL, with diff and SHA-256 versioning |
| `showcase` | 5177 | All 32 components with iNaturalist mock data, works offline |
| `mobile` | 5178 | Phone-frame UI with real MCP, Gemma E2B, and skills management |

## Getting started

```bash
# Required for composer and viewer
echo "ANTHROPIC_API_KEY=sk-ant-..." > apps/composer/.env
echo "ANTHROPIC_API_KEY=sk-ant-..." > apps/viewer/.env

npm install
npm run dev        # all 6 apps in parallel
npm run dev:composer   # single app
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

AGPL-3.0-or-later
