# Installation Guide

Get WebMCP Auto-UI running locally in under 5 minutes.

## Prerequisites

- **Node.js 22+** (`node -v`)
- **npm 10+** (`npm -v`)
- An **Anthropic API key** (for LLM-powered chat features)

## Clone and install

```bash
git clone https://github.com/jeanbaptiste/webmcp-auto-ui.git
cd webmcp-auto-ui
npm install
```

`npm install` resolves all workspaces automatically (packages + apps).

## Project structure

```
webmcp-auto-ui/
  packages/
    core/       @webmcp-auto-ui/core   — W3C WebMCP polyfill + MCP client
    sdk/        @webmcp-auto-ui/sdk    — HyperSkill format, skills registry, canvas store
    agent/      @webmcp-auto-ui/agent  — LLM agent loop + providers + UI tools
    ui/         @webmcp-auto-ui/ui     — 34+ Svelte 5 components
  apps/
    home/       Landing page + app launcher
    composer/   Visual skill composer with drag-and-drop canvas
    todo/       Todo app demo (MCP-powered)
    viewer/     HyperSkill URL viewer / renderer
    showcase/   Component showcase + WebMCP tool demos
    mobile/     Mobile-optimized interface
```

## Build packages

Packages must be built in dependency order:

```bash
# 1. core (no deps)
npm -w packages/core run build

# 2. sdk (no package deps, but shares types)
npm -w packages/sdk run build

# 3. agent (depends on core)
npm -w packages/agent run build

# 4. ui (standalone, but build last for safety)
npm -w packages/ui run build
```

## Run dev servers

Run all apps at once:

```bash
npm run dev
```

Or run a single app:

```bash
npm run dev:home
npm run dev:composer
npm run dev:todo
npm run dev:viewer
npm run dev:showcase
npm run dev:mobile
```

## Port mapping

| App       | Port | URL                    |
|-----------|------|------------------------|
| home      | 5173 | http://localhost:5173   |
| composer  | 5174 | http://localhost:5174   |
| todo      | 5175 | http://localhost:5175   |
| viewer    | 5176 | http://localhost:5176   |
| showcase  | 5177 | http://localhost:5177   |
| mobile    | 5178 | http://localhost:5178   |

## Environment variables

| Variable           | Used by        | Purpose                                      |
|--------------------|----------------|----------------------------------------------|
| `ANTHROPIC_API_KEY`| composer, todo | Server-side proxy for Anthropic Claude API    |
| `PUBLIC_BASE_URL`  | home           | Base URL for app links (default: localhost)    |

Set them in each app's `.env` file or export in your shell:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Common issues

**`Cannot find module '@webmcp-auto-ui/core'`**
Build core first: `npm -w packages/core run build`

**Port already in use**
Kill the process on that port: `lsof -ti:5173 | xargs kill` or change the port in `vite.config.ts`.

**`ERR_MODULE_NOT_FOUND` on agent imports**
The agent package uses `file:../core` as a dev dependency. Make sure core is built before running agent-dependent apps.

**Svelte check errors in UI package**
Run `npm -w packages/ui run check` to see detailed type diagnostics. Peer dependencies (`svelte`, `d3`, `leaflet`) must be installed at the root.
