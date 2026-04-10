---
title: "@webmcp-auto-ui/core"
description: W3C WebMCP polyfill and MCP Streamable HTTP client. Zero dependencies, framework-agnostic.
sidebar:
  order: 2
---

W3C WebMCP polyfill and MCP Streamable HTTP client. Zero dependencies, framework-agnostic, SSR-safe.

## What it does

- Implements the W3C WebMCP Draft CG Report (2026-03-27) as a polyfill on `navigator.modelContext`
- Provides `McpClient` for connecting to MCP servers over Streamable HTTP (JSON-RPC 2.0)
- Includes a postMessage bridge for cross-frame tool invocation
- Ships result builders and a lightweight skill registry for WebMCP tool registration

## Polyfill

```ts
import {
  initializeWebMCPPolyfill,
  cleanupWebMCPPolyfill,
  hasNativeWebMCP,
  executeToolInternal,
} from '@webmcp-auto-ui/core';
```

**`initializeWebMCPPolyfill(options?)`** -- Installs the polyfill on `navigator.modelContext`. Call once at app startup.

```ts
initializeWebMCPPolyfill({
  confirmationPolicy: 'auto', // 'auto' | 'always' | 'never'
});
```

**`cleanupWebMCPPolyfill()`** -- Removes the polyfill and restores previous descriptors.

**`hasNativeWebMCP()`** -- Returns `true` if the browser has native WebMCP support.

## McpClient

```ts
import { McpClient } from '@webmcp-auto-ui/core';

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

### McpClient API

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | `McpInitializeResult` | Initializes the MCP session |
| `listTools()` | `McpTool[]` | Lists all tools from the server |
| `callTool(name, args?)` | `McpToolResult` | Calls a tool with optional arguments |
| `disconnect()` | `void` | Ends the session |

### Options

```ts
interface McpClientOptions {
  clientName?: string;
  clientVersion?: string;
  timeout?: number;               // default: 30000
  headers?: Record<string, string>;
  autoReconnect?: boolean;        // default: true
  maxReconnectAttempts?: number;  // default: 3
}
```

## McpMultiClient

Manages simultaneous connections to multiple MCP servers. Aggregates tool lists from all servers and routes `callTool` to the correct server based on tool name.

```ts
import { McpMultiClient } from '@webmcp-auto-ui/core';

const multi = new McpMultiClient();
await multi.addServer('https://mcp1.example.com/mcp');
await multi.addServer('https://mcp2.example.com/mcp');

const allTools = multi.listAllTools();
const result = await multi.callTool('query_sql', { sql: 'SELECT 1' });

await multi.removeServer('https://mcp1.example.com/mcp');
await multi.disconnectAll();
```

## postMessage bridge

For cross-frame tool invocation (iframes, popups):

```ts
import {
  listenForAgentCalls,
  callToolViaPostMessage,
  isWebMCPEvent,
} from '@webmcp-auto-ui/core';

const cleanup = listenForAgentCalls(async (event) => {
  const result = await executeToolInternal(event.name, event.args);
  return result;
});

const result = await callToolViaPostMessage(window.parent, 'get_data', { id: 42 });
```

## Utilities

```ts
import {
  dispatchAndWait,
  signalCompletion,
  sanitizeSchema,
  createToolGroup,
} from '@webmcp-auto-ui/core';
```

**`sanitizeSchema(schema)`** -- Cleans a JSON Schema for Anthropic API compatibility (removes unsupported fields).

**`createToolGroup(prefix, tools)`** -- Groups related tools under a common prefix.

**`dispatchAndWait(eventName, detail?)`** -- Dispatches a CustomEvent and waits for a matching completion event. Solves the "execute must return after UI updates" pattern.

## Result builders and skill registry

```ts
import {
  textResult,
  jsonResult,
  registerSkill,
  listSkills,
} from '@webmcp-auto-ui/core';

return textResult('Operation completed successfully');
return jsonResult({ count: 42, items: ['a', 'b'] });

registerSkill({
  id: 'weather',
  name: 'Weather Dashboard',
  description: 'Shows local weather conditions',
  component: 'WeatherDash',
});
```

## Validation

```ts
import { validateJsonSchema } from '@webmcp-auto-ui/core';

const result = validateJsonSchema(someSchema);
if (!result.valid) {
  console.error(result.errors);
}
```

## Prompt caching

The `cache_control` property is applied on the tools array (not individual tools) to work correctly with Anthropic's prompt caching API. This ensures cache hits when the tool set is stable across consecutive requests, reducing latency and cost.
