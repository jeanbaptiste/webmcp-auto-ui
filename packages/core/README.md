# @webmcp-auto-ui/core

W3C WebMCP Draft 2026-03-27 polyfill and MCP Streamable HTTP client. Pure TypeScript, zero runtime dependencies.

## What's in here

**Polyfill** — implements `navigator.modelContext` for browsers that don't have native WebMCP support yet. Degrades gracefully when the API is unavailable.

**McpClient** — connects to MCP servers over Streamable HTTP (SSE). Handles `initialize`, `tools/list`, and `tools/call`.

**McpMultiClient** — manages simultaneous connections to multiple MCP servers. Aggregates tool lists and routes `callTool` to the correct server. Useful for apps that connect to several data sources at once (e.g. flex with multi-MCP).

**Prompt caching** — the `cache_control` property is applied on the tools array (not individual tools) to work correctly with Anthropic's prompt caching. This fix ensures cache hits when the tool set is stable across requests.

**createToolGroup** — registers a named group of tools on `navigator.modelContext`. Aborting the group unregisters all tools at once — useful for component lifecycle cleanup.

**sanitizeSchema** — strips JSON Schema keywords that Anthropic's API rejects (`oneOf`, `anyOf`, `allOf`, `$ref`, `if/then/else`). Applied automatically before any LLM call.

**validateJsonSchema** — lightweight runtime schema validator used to check tool inputs.

**textResult / jsonResult** — build MCP `ToolExecuteResult` objects.

**listenForAgentCalls** — bridges `window.postMessage` events from the Chrome extension to local tool execution.

## Install

```bash
npm install @webmcp-auto-ui/core
```

## Usage

```ts
import {
  initializeWebMCPPolyfill,
  McpClient,
  McpMultiClient,
  createToolGroup,
  textResult, jsonResult,
  listenForAgentCalls,
  executeToolInternal,
} from '@webmcp-auto-ui/core';

// Init polyfill (idempotent, safe to call multiple times)
initializeWebMCPPolyfill({ allowInsecureContext: true, degradeGracefully: true });

// Bridge Chrome extension calls to local tools
const stop = listenForAgentCalls((name, args) => executeToolInternal(name, args));

// Register tools
const group = createToolGroup('my-app');
// group.register(...) — see types for full signature

// Connect to MCP server
const client = new McpClient('https://mcp.example.com/mcp');
const init = await client.connect();
const tools = await client.listTools();
const result = await client.callTool('my_tool', { arg: 'value' });

// Multi-server connections
const multi = new McpMultiClient();
await multi.addServer('https://mcp1.example.com/mcp');
await multi.addServer('https://mcp2.example.com/mcp');
const allTools = multi.listAllTools();      // aggregated from all servers
const result = await multi.callTool('query_sql', { sql: 'SELECT 1' }); // routes to correct server

// Cleanup
stop();
group.abort();
await multi.disconnectAll();
```

## WebMCP Server

WebMCP is a protocol symmetric to MCP. MCP provides remote data tools, WebMCP provides local display/interaction tools.

### Creating a WebMCP server

```ts
import { createWebMcpServer } from '@webmcp-auto-ui/core';

const myServer = createWebMcpServer('mywidgets', {
  description: 'Custom visualization widgets'
});

// Register widgets (recipe .md + renderer component)
myServer.registerWidget(recipeMarkdown, RendererComponent);

// Add custom tools
myServer.addTool({
  name: 'theme',
  description: 'Switch theme',
  inputSchema: { type: 'object', properties: { mode: { type: 'string' } } },
  execute: async (params) => ({ ok: true })
});

// Get a layer for the agent loop
const layer = myServer.layer();
// → { protocol: 'webmcp', serverName: 'mywidgets', description: '...', tools: [...] }
```

### Frontmatter parser

```ts
import { parseFrontmatter } from '@webmcp-auto-ui/core';

const { frontmatter, body } = parseFrontmatter(markdownString);
// frontmatter.widget, frontmatter.schema, frontmatter.description
// body = markdown content after the --- block
```

## Types

All types follow the W3C WebMCP Draft 2026-03-27 spec. See `src/types.ts`.

## License

AGPL-3.0-or-later
