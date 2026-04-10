---
title: Installation
description: Installer et lancer WebMCP Auto-UI en local en moins de 5 minutes
sidebar:
  order: 1
---

## Prerequis

- **Node.js 22+** (`node -v`)
- **npm 10+** (`npm -v`)
- Une **cle API Anthropic** (pour les features LLM avec Claude)

## Cloner et installer

```bash
git clone https://github.com/jeanbaptiste/webmcp-auto-ui.git
cd webmcp-auto-ui
npm install
```

`npm install` resout tous les workspaces automatiquement (packages + apps).

## Structure du projet

```
webmcp-auto-ui/
  packages/
    core/       @webmcp-auto-ui/core   -- W3C WebMCP polyfill + MCP client
    sdk/        @webmcp-auto-ui/sdk    -- HyperSkill format, skills registry, canvas store
    agent/      @webmcp-auto-ui/agent  -- Agent loop + 4 providers + ToolLayers + recettes
    ui/         @webmcp-auto-ui/ui     -- 34+ Svelte 5 components + agent UI widgets
  apps/
    home/       Landing page + app launcher
    flex/       Canvas drag & resize, multi-MCP, ephemeral chat
    flex2/      Layers, component() unique, debug panel, mode composeur/consommateur
    todo/       Todo app demo (MCP-powered)
    todo2/      Todo WebMCP, template minimal
    viewer/     HyperSkill URL viewer / renderer
    viewer2/    Lecteur HyperSkills read-only avec CRUD, DAG, paste URI
    showcase/   Component showcase + WebMCP tool demos
    showcase2/  Demo dynamique avec agent + MCP + 3 themes
    recipes/    Explorateur de recettes MCP + WebMCP avec test live
```

## Builder les packages

Les packages doivent etre buildes dans l'ordre de dependance :

```bash
# 1. core (pas de deps)
npm -w packages/core run build

# 2. sdk (pas de deps package, partage des types)
npm -w packages/sdk run build

# 3. agent (depend de core)
npm -w packages/agent run build

# 4. ui (standalone, builder en dernier par securite)
npm -w packages/ui run build
```

## Lancer les serveurs dev

Toutes les apps v1 en parallele :

```bash
npm run dev
```

Ou une app specifique :

```bash
npm run dev:home
npm run dev:flex
npm run dev:todo
npm run dev:viewer
npm run dev:showcase
```

Pour les nouvelles apps (v2), lancer individuellement :

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

Les apps v2 (flex2, viewer2, todo2, showcase2, recipes) sont assignees a des ports par Vite au lancement.

## Variables d'environnement

| Variable           | Apps                    | Role                                          |
|--------------------|-------------------------|-----------------------------------------------|
| `ANTHROPIC_API_KEY`| flex, flex2, todo, todo2 | Proxy server-side pour l'API Anthropic Claude |
| `PUBLIC_BASE_URL`  | home                    | Base URL pour les liens (default: localhost)   |

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Problemes courants

**`Cannot find module '@webmcp-auto-ui/core'`**
Builder core d'abord : `npm -w packages/core run build`

**Port deja utilise**
`lsof -ti:5173 | xargs kill` ou changer le port dans `vite.config.ts`.

**`ERR_MODULE_NOT_FOUND` sur les imports agent**
Le package agent depend de core via `file:../core`. Builder core avant.

**Svelte check errors dans le package UI**
`npm -w packages/ui run check` pour les diagnostics. Les peer deps (`svelte`, `d3`, `leaflet`) doivent etre installees a la racine.
