---
title: ToolLayers
description: Structuring tools into McpLayer and WebMcpLayer layers
sidebar:
  order: 1
---

ToolLayers are the v0.8 API that structures tools into typed layers. They replace the flat `mcpTools[]` passing pattern.

## Architecture

```
+--------------------------------------------------+
|                    ToolLayer[]                     |
|                                                    |
|  +-- McpLayer (per server) ----+  +-- WebMcpLayer ----+ |
|  |  tools: MCP tools           |  | tools: widget_display | |
|  |  recipes: MCP recipes       |  | canvas, recall        | |
|  |  serverName, serverUrl      |  | recipes: UI           | |
|  +-----------------------------+  +----------------------+ |
+--------------------------------------------------+
         |                               |
    buildSystemPrompt()          buildToolsFromLayers()
```

## McpLayer

One `McpLayer` is created per connected MCP server. It carries DATA tools and server recipes.

```ts
import type { McpLayer } from '@webmcp-auto-ui/agent';

const mcpLayer: McpLayer = {
  protocol: 'mcp',
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
  protocol: 'mcp';
  serverUrl: string;
  serverName?: string;
  tools: McpToolDef[];
  recipes?: McpRecipe[];
}
```

## WebMcpLayer (autoui)

The `autoui` server provides a pre-configured `WebMcpLayer` with all native widgets and WebMCP recipes.

```ts
import { autoui } from '@webmcp-auto-ui/agent';

// autoui.layer() generates a ready-to-use WebMcpLayer
const uiLayer = autoui.layer();
// { protocol: 'webmcp', serverName: 'autoui', description: '...', tools: [...] }
```

### Interface

```ts
interface WebMcpLayer {
  protocol: 'webmcp';
  serverName: string;
  description: string;
  tools: WebMcpToolDef[];
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

const prompt = buildSystemPrompt(layers);
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
// Smart mode: MCP tools + 3 UI tools (list_components, get_component, component)
// Explicit mode: MCP tools + 31 render_* + component()
```

## Usage with runAgentLoop

```ts
import { runAgentLoop } from '@webmcp-auto-ui/agent';

const result = await runAgentLoop('List the green party deputies', {
  provider,
  layers,
  callbacks: {
    onWidget: (type, data) => { canvas.addWidget(type, data); return { id: 'w_1' }; },
  },
});
```

## Multi-server

Multiple `McpLayer` instances can coexist. Tools are aggregated and the LLM sees all tools from all servers in the prompt.

```ts
const layers: ToolLayer[] = [
  mcpLayer1,       // Tricoteuses -- politics
  mcpLayer2,       // iNaturalist -- biodiversity
  autoui.layer(),  // widgets + recipes
];
```
