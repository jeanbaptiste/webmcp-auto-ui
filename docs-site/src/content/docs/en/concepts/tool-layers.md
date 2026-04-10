---
title: ToolLayers
description: Structuring tools into McpLayer and UILayer layers (v0.8)
sidebar:
  order: 1
---

ToolLayers are the v0.8 API that structures tools into typed layers. They replace the flat `mcpTools[]` passing pattern.

## Architecture

```
+--------------------------------------------------+
|                    ToolLayer[]                     |
|                                                    |
|  +-- McpLayer (per server) ----+  +-- UILayer --+ |
|  |  tools: MCP tools           |  | component() | |
|  |  recipes: MCP recipes       |  | adapter?    | |
|  |  serverName, serverUrl      |  | recipes: UI | |
|  +-----------------------------+  +-------------+ |
+--------------------------------------------------+
         |                               |
    buildSystemPrompt()          buildToolsFromLayers()
```

## McpLayer

One `McpLayer` is created per connected MCP server. It carries DATA tools and server recipes.

```ts
import type { McpLayer } from '@webmcp-auto-ui/agent';

const mcpLayer: McpLayer = {
  source: 'mcp',
  serverUrl: 'https://mcp.code4code.eu/mcp',
  serverName: 'Tricoteuses',
  tools: await client.listTools(),
  recipes: [
    { name: 'profil-depute', description: 'Full deputy profile' },
    { name: 'scrutin-detail', description: 'Detailed vote analysis' },
  ],
};
```

### Interface

```ts
interface McpLayer {
  source: 'mcp';
  serverUrl: string;
  serverName?: string;
  tools: McpToolDef[];
  recipes?: McpRecipe[];
}
```

## UILayer

A single `UILayer` per app. Carries `component()`, the optional `ComponentAdapter`, and WebMCP recipes.

```ts
import type { UILayer } from '@webmcp-auto-ui/agent';
import { WEBMCP_RECIPES, filterRecipesByServer } from '@webmcp-auto-ui/agent';

const uiLayer: UILayer = {
  source: 'ui',
  recipes: filterRecipesByServer(WEBMCP_RECIPES, ['Tricoteuses']),
};
```

### With ComponentAdapter (explicit mode)

```ts
import { ComponentAdapter, minimalPreset } from '@webmcp-auto-ui/agent';

const adapter = new ComponentAdapter();
adapter.registerAll(minimalPreset());

const uiLayer: UILayer = {
  source: 'ui',
  adapter,
  recipes: filterRecipesByServer(WEBMCP_RECIPES, ['Tricoteuses']),
};
```

### Interface

```ts
interface UILayer {
  source: 'ui';
  adapter?: ComponentAdapter;
  recipes?: Recipe[];
}
```

## Building layers

```ts
const layers: ToolLayer[] = [mcpLayer1, mcpLayer2, uiLayer];
```

## buildSystemPrompt

Generates a structured markdown prompt:

```ts
import { buildSystemPrompt } from '@webmcp-auto-ui/agent';

const prompt = buildSystemPrompt(layers, { toolMode: 'smart' });
```

Output:

```
## mcp (Tricoteuses, iNaturalist)

### DATA tools (12)
- query_sql: Execute a SQL query
- list_tables: List available tables
...

### server recipes (2)
- profil-depute: Full deputy profile
- scrutin-detail: Detailed vote analysis

## webmcp

### component() -- single UI tool
Available components: stat, kv, list, chart, alert, ...
```

## buildToolsFromLayers

Converts layers to `AnthropicTool[]`:

```ts
import { buildToolsFromLayers } from '@webmcp-auto-ui/agent';

const tools = buildToolsFromLayers(layers, 'smart');
// Smart mode: MCP tools + 1 single component() tool
// Explicit mode: MCP tools + 31 render_* + component()
```

## Usage with runAgentLoop

```ts
import { runAgentLoop } from '@webmcp-auto-ui/agent';

const result = await runAgentLoop('List the green party deputies', {
  provider,
  layers,
  toolMode: 'smart',
  callbacks: {
    onBlock: (type, data) => canvas.addBlock(type, data),
  },
});
```

## Multi-server

Multiple `McpLayer` instances can coexist. Tools are aggregated and the LLM sees all tools from all servers in the prompt.

```ts
const layers: ToolLayer[] = [
  mcpLayer1,  // Tricoteuses -- politics
  mcpLayer2,  // iNaturalist -- biodiversity
  uiLayer,    // component() + recipes
];
```
