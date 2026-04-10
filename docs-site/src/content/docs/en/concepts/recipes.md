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

## Complete recipe flow

```
MCP Connection                 buildSystemPrompt()              Agent loop (LLM)
     |                              |                               |
     |  1. list_recipes(server)     |                               |
     |  -> {name, description}[]    |                               |
     |                              |                               |
     |  2. Load WEBMCP_RECIPES      |                               |
     |     (local .md files)        |                               |
     |                              |                               |
     |          3. Prompt injection |                               |
     |          ## mcp: DATA tools + "server recipes (N)"           |
     |          ## webmcp: component() + "UI recipes (N)"           |
     |          (short summaries only — no body)                     |
     |                              |                               |
     |                              |   4. list_components()        |
     |                              |   <- components + recipes     |
     |                              |                               |
     |                              |   5. get_component("id")      |
     |                              |   <- schema or recipe body    |
     |                              |                               |
     |                              |   6. component("recipe-id")   |
     |                              |   <- body as composition guide|
     |                              |                               |
     |                              |   7. get_recipe("name")       |
     |                              |   <- full MCP server recipe   |
     |                              |                               |
     |                              |   8. component("table",{...}) |
     |                              |   -> onBlock -> Canvas        |
```

### Step 1: Connection and collection

On MCP connection, the app calls `list_recipes` on each server. It receives a `{name, description}[]` array — short summaries, not the full body.

```ts
const recipesResult = await client.callTool('list_recipes', {});
const mcpRecipes: McpRecipe[] = JSON.parse(recipesResult.content[0].text);
// [{ name: 'profil-depute', description: 'Full profile with votes and mandates' }, ...]
```

In parallel, built-in WebMCP recipes (`WEBMCP_RECIPES`) are loaded from `.md` files in the agent package.

### Step 2: Prompt construction (buildSystemPrompt)

The system prompt is structured in sections:

```
## mcp (Tricoteuses)
### DATA tools (12)
- query_sql: Execute an SQL query...
- search_deputes: Search for a deputy...
### server recipes (2)
- profil-depute: Full profile with votes and mandates
- scrutin-detail: Detailed public vote analysis

## webmcp
### component() — single UI tool
Available components: stat-card, chart, table, ...
### UI recipes (3)
- Compose a KPI dashboard: numeric metrics [stat-card, chart, table, kv]
- Parliamentary profile: deputy profile [profile, hemicycle, timeline]
```

The detailed recipe body is **NOT** in the prompt. Only `name`, `when` and `components_used` are injected. Cost: ~500 tokens for 5 recipes.

### Step 3: Tools sent to the LLM

In smart mode (default), the LLM receives:
- MCP tools (DATA) — `query_sql`, `search_deputes`, etc.
- 3 UI tools: `list_components()`, `get_component()`, `component()`

Neither `list_recipes` nor `get_recipe` are sent as tools to the LLM. The LLM discovers MCP recipes via the prompt, and their details via `get_recipe` (MCP server tool).

### Step 4: Lazy loading (agent discovery)

The full recipe body is loaded on demand, not at startup. The LLM decides when it needs the detail:

**WebMCP recipes:**

```
list_components()              -> list components + WebMCP recipes (id, when, components)
get_component("recipe-id")    -> full body of a WebMCP recipe
component("recipe-id")         -> returns the body as a composition guide
```

**MCP recipes (server):**

```
get_recipe("profil-depute")    -> full body of the server recipe
```

The LLM sees names and descriptions in the prompt, then requests the detail only when needed. This avoids bloating the initial context.

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

### Detail via get_recipe

The LLM sees summaries in the prompt. When it needs the detail, it calls `get_recipe` (MCP server tool):

```
LLM -> get_recipe({ name: "profil-depute" })
    <- { body: "1. Call search_deputes(...)\n2. Call get_votes(...)\n..." }
```

The server decides the content of `body` — workflow, examples, recommended parameters.

## WebMCP vs MCP comparison

| | WebMCP Recipe (UI) | MCP Recipe (server) |
|--|---------------------|----------------------|
| **Source** | Agent package (.md files) | MCP Server (`list_recipes`) |
| **Content** | How to present with component() | What tools return, how to combine them |
| **Prompt section** | `## webmcp > UI recipes` | `## mcp > server recipes` |
| **Type** | `Recipe` | `McpRecipe` |
| **Carried by** | `UILayer.recipes` | `McpLayer.recipes` |
| **Lazy loading** | `get_component("id")` or `component("id")` | `get_recipe(name)` (MCP tool) |
| **Guides what** | The **View** (how to display) | The **Model/Data** (what to request) |
| **Body in prompt** | No (summaries only) | No (summaries only) |

### Two complementary axes

WebMCP and MCP recipes serve different purposes:

- **WebMCP** guides the "how to display": which components to use, in what layout, with what parameters. This is the **View** layer.
- **MCP** guides the "what to request": which tools to call, in what order, with what parameters. This is the **Model/Data** layer.

The agent uses both together: an MCP recipe tells it how to get the data, a WebMCP recipe tells it how to present it.
