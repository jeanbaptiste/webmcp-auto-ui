---
title: Workflow
description: The complete flow from layers to prompt to tools to LLM to component() to render
sidebar:
  order: 3
---

## Overview

The v0.8 workflow follows a linear flow in 7 steps:

```
App                      Agent Package                     LLM
 |                            |                             |
 |  1. Build ToolLayer[]      |                             |
 |    - McpLayer (per server) |                             |
 |    - UILayer (+ adapter)   |                             |
 |                            |                             |
 |  2. buildSystemPrompt()    |                             |
 |  ----layers, toolMode----> |                             |
 |  <--- structured prompt -- |                             |
 |       ## mcp / ## webmcp   |                             |
 |                            |                             |
 |  3. buildToolsFromLayers() |                             |
 |  ----layers, toolMode----> |                             |
 |  <--- AnthropicTool[] ---  |                             |
 |                            |                             |
 |  4. runAgentLoop(msg, {layers})                          |
 |  ------------------------------------->  prompt + tools  |
 |                            |             |               |
 |                            |   5. list_components()      |
 |                            |   <----------------------   |
 |                            |   --- component list --->   |
 |                            |             |               |
 |                            |   6. query_sql({sql})       |
 |                            |   <----------------------   |
 |                   MCP call |   --- data --------------->  |
 |                            |             |               |
 |                            |   7. component("table",     |
 |                            |      {rows, columns})       |
 |  <-- onBlock(type, data) - |   <----------------------   |
 |  Canvas renders the block  |                             |
```

## Step by step

### 1. Build ToolLayers

The app builds a `ToolLayer[]` array: one `McpLayer` per connected MCP server, plus a single `UILayer`.

```ts
import type { McpLayer, UILayer, ToolLayer } from '@webmcp-auto-ui/agent';
import { WEBMCP_RECIPES, filterRecipesByServer } from '@webmcp-auto-ui/agent';

const mcpLayer: McpLayer = {
  source: 'mcp',
  serverUrl: 'https://mcp.code4code.eu/mcp',
  serverName: 'Tricoteuses',
  tools: await client.listTools(),
  recipes: [{ name: 'profil-depute', description: 'Full deputy profile' }],
};

const uiLayer: UILayer = {
  source: 'ui',
  recipes: filterRecipesByServer(WEBMCP_RECIPES, ['Tricoteuses']),
};

const layers: ToolLayer[] = [mcpLayer, uiLayer];
```

### 2. Generate the system prompt

`buildSystemPrompt()` produces a structured markdown prompt:

```ts
import { buildSystemPrompt } from '@webmcp-auto-ui/agent';

const prompt = buildSystemPrompt(layers, { toolMode: 'smart' });
```

The generated prompt contains:
- `## mcp (Tricoteuses)` -- list of DATA tools + server recipes
- `## webmcp` -- instructions for `component()` + UI recipes

### 3. Build the tools

`buildToolsFromLayers()` converts layers to `AnthropicTool[]`:

```ts
import { buildToolsFromLayers } from '@webmcp-auto-ui/agent';

const tools = buildToolsFromLayers(layers, 'smart');
// Smart mode: MCP tools + 3 UI tools (list_components, get_component, component)
// Explicit mode: MCP tools + 31 render_* + component()
```

### 4. Run the agent loop

```ts
import { runAgentLoop } from '@webmcp-auto-ui/agent';

const result = await runAgentLoop('Show me revenue by quarter', {
  provider,
  layers,
  toolMode: 'smart',
  maxIterations: 5,
  callbacks: {
    onBlock: (type, data) => canvas.addBlock(type, data),
    onText: (text) => console.log('LLM:', text),
    onToolCall: (call) => console.log('Tool:', call.name),
  },
  signal: abortController.signal,
});
```

### 5. Discovery (smart mode)

In smart mode, the LLM has 3 UI tools. It calls `list_components()` to discover the 56 available components, then `get_component(name)` for the detailed schema:

```
LLM -> list_components()
    <- list of 56 components with name, description, renderable flag

LLM -> get_component("stat-card")
    <- detailed JSON schema for stat-card
```

### 6. DATA calls (MCP)

The LLM calls MCP server tools to fetch data:

```
LLM -> query_sql({ sql: "SELECT * FROM deputies WHERE district = 'Paris 1'" })
    <- { content: [{ text: "[{name: 'Dupont', ...}]" }] }
```

### 7. Render (component)

The LLM calls `component()` with a type and parameters to render the result:

```
LLM -> component("profile", { name: "Jean Dupont", subtitle: "Deputy for Paris 1" })
    -> onBlock("profile", { name: "Jean Dupont", ... })
    -> Canvas displays the block
```

## Smart vs explicit mode

| | Smart (default) | Explicit |
|--|---------------|----------|
| **UI tools** | 3: `list_components()`, `get_component()`, `component()` | 31 `render_*` + `component()` |
| **Discovery** | `list_components()` + `get_component(name)` | LLM sees all tools |
| **Schema tokens** | ~200 tokens | ~3000 tokens |
| **Recommended for** | Cloud (Claude) | WASM (Gemma) or debug |

## Loop result

```ts
console.log(result.text);       // final LLM text
console.log(result.toolCalls);  // list of tool calls made
console.log(result.metrics);    // metrics (tokens, latency, iterations)
console.log(result.stopReason); // 'end_turn' | 'max_iterations' | 'error'
console.log(result.messages);   // complete conversation for resumption
```

## Recipes in the workflow

Recipes integrate into the layers -> prompt -> LLM -> component() flow at three levels:

### At connection time (step 1)

The app collects recipes from both sides:

```ts
// MCP recipes: from the server
const mcpRecipes = JSON.parse(
  (await client.callTool('list_recipes', {})).content[0].text
);

// WebMCP recipes: local .md files, filtered by server
const uiRecipes = filterRecipesByServer(WEBMCP_RECIPES, ['Tricoteuses']);
```

Both are injected into the layers:

```ts
const mcpLayer: McpLayer = { source: 'mcp', ..., recipes: mcpRecipes };
const uiLayer: UILayer = { source: 'ui', recipes: uiRecipes };
```

### In the prompt (step 2)

`buildSystemPrompt()` injects compact summaries — not the body:

```
## mcp (Tricoteuses)
### server recipes (2)
- profil-depute: Full profile with votes and mandates

## webmcp
### UI recipes (3)
- Compose a KPI dashboard: numeric metrics [stat-card, chart, table, kv]
```

### During the agent loop (steps 5-7)

The LLM discovers details on demand (lazy loading):

```
LLM -> list_components()               <- list components + WebMCP recipes
LLM -> get_component("weather-viz")    <- full WebMCP recipe body
LLM -> get_recipe("profil-depute")      <- full MCP server recipe body
LLM -> component("stat-card", {label: "Temperature", value: "22C"})
    -> onBlock -> Canvas
```

WebMCP recipes guide the **View** (how to display), MCP recipes guide the **Model/Data** (what to request). The agent uses both together.

See [Recipes](/en/concepts/recipes/) for the full detail on types and lazy loading.

## Auto UI generation pattern

```
1. User connects an MCP server
2. App calls client.listTools() -> tool discovery
3. App builds ToolLayers (McpLayer + UILayer)
4. User asks a question in natural language
5. runAgentLoop:
   - LLM calls an MCP tool (data)
   - LLM calls component() (display)
   - Repeats until end_turn
6. Result: dashboard generated without manual composition
```
