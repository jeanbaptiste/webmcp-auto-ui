# @webmcp-auto-ui/core

W3C WebMCP polyfill, MCP Streamable HTTP client, WebMCP server factory. Zero dependencies, framework-agnostic, SSR-safe.

## What it does

- Implements the W3C WebMCP Draft CG Report (2026-03-27) as a polyfill on `navigator.modelContext`
- Provides `McpClient` for connecting to MCP servers over Streamable HTTP (JSON-RPC 2.0)
- Provides `createWebMcpServer` for creating local WebMCP servers with widget registration
- Includes `parseFrontmatter` for parsing markdown recipes with YAML frontmatter
- Includes a postMessage bridge for cross-frame tool invocation
- Ships result builders and a lightweight skill registry for WebMCP tool registration

## WebMCP Server

### createWebMcpServer

Factory for creating a WebMCP server. A server registers widgets (via recipes) and exposes tools for the agent loop.

```ts
import { createWebMcpServer } from '@webmcp-auto-ui/core';

const server = createWebMcpServer('designkit', {
  description: 'Custom design system widgets',
});
```

### registerWidget

Registers a widget from a markdown recipe with YAML frontmatter. The frontmatter must include `widget` (name), `description`, and `schema` (JSON Schema of the widget props).

```ts
const recipe = `---
widget: metric-card
description: Business metric card with sparkline.
group: business
schema:
  type: object
  required:
    - label
    - value
  properties:
    label:
      type: string
    value:
      type: string
    sparkline:
      type: array
      items:
        type: number
---

## Quand utiliser
Pour afficher un KPI business avec mini graphique.

## Comment
Appeler widget_display('metric-card', {label: "MRR", value: "$42K", sparkline: [10, 20, 15, 30]}).
`;

server.registerWidget(recipe, MetricCardComponent);
```

On first `registerWidget` call, the server auto-generates 3 built-in tools:
- **`search_recipes`** — List available widget recipes (filterable by query)
- **`get_recipe`** — Get the full recipe for a widget (schema + instructions)
- **`widget_display`** — Display a widget on the canvas (validates params against schema)

### addTool

Adds a custom tool to the server (beyond the 3 built-in ones):

```ts
server.addTool({
  name: 'export_pdf',
  description: 'Export the current canvas as PDF',
  inputSchema: { type: 'object', properties: { quality: { type: 'string' } } },
  execute: async (params) => {
    // ...
    return { url: '/exports/canvas.pdf' };
  },
});
```

### layer

Returns a `WebMcpLayer` for use in the agent loop:

```ts
const layer = server.layer();
// {
//   protocol: 'webmcp',
//   serverName: 'designkit',
//   description: 'Custom design system widgets',
//   tools: WebMcpToolDef[]  // built-in + custom tools
// }
```

### getWidget / listWidgets

```ts
const entry = server.getWidget('metric-card');
// { name, description, inputSchema, recipe, renderer, group? }

const all = server.listWidgets();
// WidgetEntry[]
```

### WebMcpServer interface

```ts
interface WebMcpServer {
  readonly name: string;
  readonly description: string;

  registerWidget(recipeMarkdown: string, renderer: unknown): void;
  addTool(tool: WebMcpToolDef): void;

  layer(): {
    protocol: 'webmcp';
    serverName: string;
    description: string;
    tools: WebMcpToolDef[];
  };

  getWidget(name: string): WidgetEntry | undefined;
  listWidgets(): WidgetEntry[];
}
```

### WebMcpToolDef

```ts
interface WebMcpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}
```

### WidgetEntry

```ts
interface WidgetEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  recipe: string;          // markdown body (after frontmatter)
  renderer: unknown;       // Svelte component or null (for native widgets)
  group?: string;
}
```

## parseFrontmatter

Parses a markdown file with YAML frontmatter (--- delimited). No external YAML dependency.

```ts
import { parseFrontmatter } from '@webmcp-auto-ui/core';

const { frontmatter, body } = parseFrontmatter(`---
widget: stat
description: KPI counter
schema:
  type: object
  required:
    - label
---
## Usage
Display a stat.
`);

console.log(frontmatter.widget); // 'stat'
console.log(body);               // '## Usage\nDisplay a stat.'
```

Supports scalars, nested objects (indentation), arrays (`- item`), inline values, quoted strings, inline objects/arrays.

### ParsedFrontmatter

```ts
interface ParsedFrontmatter {
  frontmatter: Record<string, unknown>;
  body: string;
}
```

## Polyfill

```ts
import {
  initializeWebMCPPolyfill,
  cleanupWebMCPPolyfill,
  hasNativeWebMCP,
  executeToolInternal,
} from '@webmcp-auto-ui/core';
```

**`initializeWebMCPPolyfill(options?)`** — Installs the polyfill on `navigator.modelContext`. Call once at app startup.

```ts
initializeWebMCPPolyfill({
  confirmationPolicy: 'auto', // 'auto' | 'always' | 'never'
});
```

**`cleanupWebMCPPolyfill()`** — Removes the polyfill and restores previous descriptors.

**`hasNativeWebMCP()`** — Returns `true` if the browser has native WebMCP support.

**`executeToolInternal(name, args)`** — Executes a registered tool by name. Used internally by the polyfill.

## McpMultiClient

```ts
import { McpMultiClient } from '@webmcp-auto-ui/core';
```

Manages simultaneous connections to multiple MCP servers. Aggregates tool lists from all servers and routes `callTool` to the correct server based on tool name.

```ts
const multi = new McpMultiClient();
await multi.addServer('https://mcp1.example.com/mcp');
await multi.addServer('https://mcp2.example.com/mcp');

const allTools = multi.listAllTools();
const result = await multi.callTool('query_sql', { sql: 'SELECT 1' });

await multi.removeServer('https://mcp1.example.com/mcp');
await multi.disconnectAll();
```

## MCP Client

```ts
import { McpClient } from '@webmcp-auto-ui/core';
```

Streamable HTTP client for MCP servers. Uses native `fetch`, no dependencies.

```ts
const client = new McpClient('https://mcp.example.com/mcp', {
  clientName: 'my-app',
  clientVersion: '1.0.0',
  timeout: 30000,
  headers: { Authorization: 'Bearer ...' },
});

const info = await client.connect();
const tools = await client.listTools();
const result = await client.callTool('get_weather', { city: 'Paris' });
await client.disconnect();
```

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | `McpInitializeResult` | Initializes the MCP session |
| `listTools()` | `McpTool[]` | Lists all tools from the server |
| `callTool(name, args?)` | `McpToolResult` | Calls a tool with optional arguments |
| `disconnect()` | `void` | Ends the session |

### Prompt caching fix

The `cache_control` property is applied on the tools array (not individual tools) to work correctly with Anthropic's prompt caching API.

## postMessage bridge

```ts
import {
  listenForAgentCalls,
  stopListening,
  callToolViaPostMessage,
  isWebMCPEvent,
} from '@webmcp-auto-ui/core';
```

**`listenForAgentCalls(handler)`** — Listens for `webmcp:call-tool` events from iframes or other windows.

**`callToolViaPostMessage(target, name, args)`** — Sends a tool call to a parent/child window via postMessage.

**`isWebMCPEvent(event)`** — Type guard for WebMCP postMessage events.

## Utilities

```ts
import {
  dispatchAndWait,
  signalCompletion,
  sanitizeSchema,
  createToolGroup,
} from '@webmcp-auto-ui/core';
```

- **`dispatchAndWait(eventName, detail?, options?)`** — Dispatches a CustomEvent and waits for a matching completion event.
- **`signalCompletion(requestId, result?)`** — Fires the completion event for `dispatchAndWait`.
- **`sanitizeSchema(schema)`** — Cleans a JSON Schema for Anthropic API compatibility.
- **`createToolGroup(prefix, tools)`** — Groups related tools under a common prefix.

## Result builders

```ts
import { textResult, jsonResult } from '@webmcp-auto-ui/core';

return textResult('Operation completed successfully');
return jsonResult({ count: 42, items: ['a', 'b'] });
```

## Validation

```ts
import { validateJsonSchema } from '@webmcp-auto-ui/core';

const result = validateJsonSchema(someSchema);
if (!result.valid) console.error(result.errors);
```

## Types

All types are exported and documented via JSDoc. Key types:

- `ModelContext`, `ModelContextTool` — W3C WebMCP spec types
- `McpClient`, `McpTool`, `McpToolResult` — MCP protocol types
- `WebMcpServer`, `WebMcpToolDef`, `WidgetEntry` — WebMCP server types
- `ParsedFrontmatter` — frontmatter parser types
- `WebMCPCallToolEvent`, `PostMessageBridgeOptions` — bridge types
- `JsonSchema`, `JsonSchemaObject` — schema validation types
