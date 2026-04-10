---
title: Architecture
description: Structure monorepo, dependances entre packages, et architecture 3 couches (v0.7.0)
sidebar:
  order: 2
---

## Structure monorepo

```
webmcp-auto-ui/
 |
 +-- packages/
 |    +-- core/          W3C WebMCP polyfill + MCP Streamable HTTP client
 |    +-- sdk/           HyperSkill format, skills CRUD, canvas store (Svelte 5)
 |    +-- agent/         LLM agent loop, 4 providers, ToolLayers, recettes, component()
 |    +-- ui/            34+ Svelte 5 components (primitives, widgets, WM)
 |
 +-- apps/
 |    +-- home/          Landing page, app launcher (port 5173)
 |    +-- todo/          MCP-powered todo demo (port 5175)
 |    +-- viewer/        HyperSkill URL renderer (port 5176)
 |    +-- showcase/      Component showcase + WebMCP tool demos (port 5177)
 |    +-- flex/          Canvas drag & resize, multi-MCP, chat (port 5179)
 |    +-- flex2/         Layers, component() unique, debug panel
 |    +-- viewer2/       Lecteur HyperSkills read-only avec CRUD, DAG
 |    +-- showcase2/     Demo dynamique avec agent + MCP + 3 themes
 |    +-- todo2/         Todo WebMCP, template minimal
 |    +-- recipes/       Explorateur de recettes MCP + WebMCP
 |
 +-- docs/               Documentation source
 +-- docs-site/          Site Starlight (cette doc)
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

- **core** : zero dependances externes. TypeScript pur, framework-agnostic, SSR-safe.
- **sdk** : depend de Svelte 5 (peer) pour le canvas store. Fournit aussi un store vanilla a `@webmcp-auto-ui/sdk/canvas-vanilla`. Shippe `MCP_DEMO_SERVERS`.
- **agent** : depend de core (`McpClient`, `sanitizeSchema`, types). 4 providers LLM. ToolLayers. Recettes. ComponentAdapter.
- **ui** : standalone. Peer deps : `svelte ^5`, `d3 ^7`, `leaflet >=1.9`.

## Les 3 couches (v0.7.0)

L'architecture v0.7.0 structure les outils en 3 couches via les `ToolLayer[]` :

```
+--------------------------------------------------+
|                    ToolLayer[]                     |
|                                                    |
|  +-- McpLayer (par serveur) ---+  +-- UILayer --+ |
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
                                 - ou render_* (explicit)
```

### McpLayer

Un par serveur MCP connecte. Porte les outils DATA (query, fetch) et les recettes serveur (ce que les outils retournent).

### UILayer

Un seul par app. Porte `component()`, le `ComponentAdapter` optionnel (pour filtrer les composants en mode explicit), et les recettes WebMCP (comment presenter les donnees).

### Recettes

Deux types de recettes cohabitent :

| Type | Source | Role | Section prompt |
|------|--------|------|---------------|
| **Recette MCP** | Serveur (`list_recipes`) | Decrit les donnees retournees | `## mcp > recettes serveur` |
| **Recette WebMCP** | Package agent (fichiers .md) | Guide la presentation UI | `## webmcp > recettes UI` |

## Stack technique

| Couche | Technologie |
|--------|-----------|
| Framework | SvelteKit (apps), Svelte 5 (composants) |
| Styling | Tailwind CSS 4 + CSS variables theming |
| UI base | bits-ui (shadcn-svelte pattern), tailwind-variants |
| Charting | D3.js v7 (Chart, Sankey, Hemicycle, D3Widget) |
| Maps | Leaflet (MapView) |
| LLM | Anthropic Claude API (via server proxy), Gemma 4 LiteRT (in-browser, OPFS), Ollama/Llamafile (local) |
| Protocol | MCP Streamable HTTP (JSON-RPC 2.0) |
| Build | TypeScript, svelte-package, Vite |

## Decisions de design

### Mode smart vs explicit

Le mode `smart` (defaut) n'expose qu'un seul tool `component()` au LLM. Le LLM decouvre les composants via `component("help")` et les rend via `component("nom", {params})`. Cela economise ~2800 tokens de schema par rapport au mode `explicit` (31 render_* individuels).

### ComponentAdapter

Decouple les definitions d'outils (ce que le LLM voit) des renderers (ce que l'utilisateur voit). Les apps enregistrent uniquement les composants dont elles ont besoin via des presets (`minimalPreset`, `nativePreset`, `allNativePreset`).

### CSS variables theming

Tokens (couleurs, radii, fonts) en CSS custom properties dans `ThemeProvider`. Deux modes built-in (`light`, `dark`) avec override complet via `theme.json` ou le canvas store. 11 tokens couvrent tous les besoins.

### FONC message bus

Les composants ne s'appellent jamais directement. Le bus `bus` singleton implemente le principe "messaging not calling" d'Alan Kay.

### BlockRenderer dispatch

`BlockRenderer` recoit `{ type, data }` et dispatche vers le widget. Pipeline : **LLM -> tool call -> block -> store -> renderer**.

### HyperSkill URL format

Skill serialisee en JSON -> base64 -> `?hs=`. Gzip au-dela de 6KB. SHA-256 pour tracabilite.
