---
title: Recipes
description: WebMCP recipes (UI) and MCP recipes (server) to guide the LLM
sidebar:
  order: 3
---

The system has two types of recipes that guide the LLM in composing interfaces.

## Overview

| Concept | Source | Role |
|---------|--------|------|
| **WebMCP Recipe** | Agent package (`.md` files) | Guides the LLM on how to present data with UI components |
| **MCP Recipe** | MCP Server (`list_recipes`/`get_recipe`) | Describes what tools return and how to combine them |

## WebMCP Recipes (UI)

WebMCP recipes guide the LLM on component selection. They are `.md` files with YAML frontmatter, parsed at build time and injected into the prompt via `UILayer.recipes`.

### Format

```markdown
---
id: compose-kpi-dashboard
name: Compose a KPI dashboard
components_used: [stat-card, chart, table, kv]
when: data contains numeric metrics
servers: []
layout:
  type: grid
  columns: 3
  arrangement: stat-cards in a row, chart + table below
---

## When to use
MCP results contain numeric metrics...

## How
1. Identify the 3-5 main KPIs
2. Display each KPI as a stat-card
3. Add a chart for time series
```

### Recipe type

```ts
interface Recipe {
  id: string;
  name: string;
  description?: string;
  components_used?: string[];
  layout?: { type: string; columns?: number; arrangement?: string };
  when: string;            // trigger condition (free text)
  servers?: string[];      // target MCP servers (empty = universal)
  body: string;            // markdown content
}
```

### API

```ts
import {
  WEBMCP_RECIPES,           // 8+ built-in recipes, auto-registered
  parseRecipe,               // parse a raw .md -> Recipe
  parseRecipes,              // parse a batch of .md -> Recipe[]
  recipeRegistry,            // read-only singleton registry
  registerRecipes,           // add to registry
  filterRecipesByServer,     // filter by connected server name
  formatRecipesForPrompt,    // format for prompt injection
} from '@webmcp-auto-ui/agent';
```

### Built-in recipes

| ID | When | Components |
|----|------|-----------|
| `composer-tableau-de-bord-kpi` | Numeric metrics | stat-card, chart, table, kv |
| `afficher-oeuvres-art-collection-musee` | Image/art collections | gallery, cards, carousel |
| `analyser-actualites-hacker-news` | News articles | cards, table, stat-card |
| `cartographier-observations-biodiversite` | Geographic data | map, stat-card, table |
| `explorer-dossiers-legislatifs` | Legislative records | timeline, kv, table |
| `gallery-images` | Multiple images | gallery, carousel |
| `parlementaire-profile` | Deputy/senator profile | profile, hemicycle, timeline |
| `rechercher-textes-juridiques` | Legal texts | list, kv, code |
| `weather-viz` | Weather data | stat-card, chart |
| `cross-server` | Multi-server data | table, chart, kv |

### Server filtering

```ts
const recipes = filterRecipesByServer(WEBMCP_RECIPES, ['tricoteuses']);
// Returns recipes whose servers contain "tricoteuses" + universal ones (servers: [])
```

### Prompt injection

Recipes are injected into the `## webmcp` section of the prompt:

```
### UI recipes (3)
- Compose a KPI dashboard: numeric metrics [stat-card, chart, table, kv]
- Parliamentary profile: deputy profile [profile, hemicycle, timeline]
```

Compact format: <500 tokens for 5 recipes.

## MCP Recipes (server)

MCP recipes come from the connected server via `list_recipes` and `get_recipe` tools. They describe what tools return.

### McpRecipe type

```ts
interface McpRecipe {
  name: string;
  description?: string;
}
```

### Usage

```ts
const recipesResult = await client.callTool('list_recipes', {});
const mcpRecipes: McpRecipe[] = JSON.parse(recipesResult.content[0].text);

const mcpLayer: McpLayer = {
  source: 'mcp',
  serverUrl: 'https://mcp.code4code.eu/mcp',
  serverName: 'Tricoteuses',
  tools: await client.listTools(),
  recipes: mcpRecipes,
};
```

They appear in the prompt under:

```
## mcp (Tricoteuses)
### server recipes (2)
- profil-depute: Full profile with votes and mandates
- scrutin-detail: Detailed public vote analysis
```

## WebMCP vs MCP comparison

| | WebMCP Recipe (UI) | MCP Recipe (server) |
|--|---------------------|----------------------|
| Source | Agent package (.md files) | MCP Server (`list_recipes`) |
| Content | How to present with component() | What the tools return |
| Prompt section | `## webmcp > UI recipes` | `## mcp > server recipes` |
| Type | `Recipe` | `McpRecipe` |
| Carried by | `UILayer.recipes` | `McpLayer.recipes` |
