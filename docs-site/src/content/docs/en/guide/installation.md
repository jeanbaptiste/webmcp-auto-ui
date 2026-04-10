---
title: Installation
description: Install and run WebMCP Auto-UI locally in less than 5 minutes
sidebar:
  order: 1
---

## Prerequisites

- **Node.js 22+** (`node -v`)
- **npm 10+** (`npm -v`)
- An **Anthropic API key** (for LLM features with Claude)

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
    core/       @webmcp-auto-ui/core   -- W3C WebMCP polyfill + MCP client
    sdk/        @webmcp-auto-ui/sdk    -- HyperSkill format, skills registry, canvas store
    agent/      @webmcp-auto-ui/agent  -- Agent loop + 4 providers + ToolLayers + recipes
    ui/         @webmcp-auto-ui/ui     -- 34+ Svelte 5 components + agent UI widgets
  apps/
    home/       Landing page + app launcher
    flex/       Canvas drag & resize, multi-MCP, ephemeral chat
    flex2/      Layers, single component(), debug panel, composer/consumer mode
    todo/       Todo app demo (MCP-powered)
    todo2/      WebMCP todo, minimal template
    viewer/     HyperSkill URL viewer / renderer
    viewer2/    Read-only HyperSkills reader with CRUD, DAG, paste URI
    showcase/   Component showcase + WebMCP tool demos
    showcase2/  Dynamic demo with agent + MCP + 3 themes
    recipes/    MCP + WebMCP recipe explorer with live testing
```

## Build the packages

Packages must be built in dependency order:

```bash
# 1. core (no deps)
npm -w packages/core run build

# 2. sdk (no package deps, shares types)
npm -w packages/sdk run build

# 3. agent (depends on core)
npm -w packages/agent run build

# 4. ui (standalone, build last for safety)
npm -w packages/ui run build
```

## Start dev servers

All v1 apps in parallel:

```bash
npm run dev
```

Or a specific app:

```bash
npm run dev:home
npm run dev:flex
npm run dev:todo
npm run dev:viewer
npm run dev:showcase
```

For v2 apps, start individually:

```bash
npm -w apps/flex2 run dev
npm -w apps/viewer2 run dev
npm -w apps/todo2 run dev
npm -w apps/showcase2 run dev
npm -w apps/recipes run dev
```

## Ports

| App       | Port | URL                    |
|-----------|------|------------------------|
| home      | 5173 | http://localhost:5173   |
| todo      | 5175 | http://localhost:5175   |
| viewer    | 5176 | http://localhost:5176   |
| showcase  | 5177 | http://localhost:5177   |
| flex      | 5179 | http://localhost:5179   |

The v2 apps (flex2, viewer2, todo2, showcase2, recipes) are assigned ports by Vite at startup.

## Environment variables

| Variable           | Apps                    | Role                                          |
|--------------------|-------------------------|-----------------------------------------------|
| `ANTHROPIC_API_KEY`| flex, flex2, todo, todo2 | Server-side proxy for the Anthropic Claude API |
| `PUBLIC_BASE_URL`  | home                    | Base URL for links (default: localhost)         |

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Common issues

**`Cannot find module '@webmcp-auto-ui/core'`**
Build core first: `npm -w packages/core run build`

**Port already in use**
`lsof -ti:5173 | xargs kill` or change the port in `vite.config.ts`.

**`ERR_MODULE_NOT_FOUND` on agent imports**
The agent package depends on core via `file:../core`. Build core first.

**Svelte check errors in the UI package**
`npm -w packages/ui run check` for diagnostics. Peer deps (`svelte`, `d3`, `leaflet`) must be installed at the root.
