# @webmcp-auto-ui/core

W3C WebMCP polyfill and MCP Streamable HTTP client. Zero dependencies, framework-agnostic, SSR-safe.

## What it does

- Implements the W3C WebMCP Draft CG Report (2026-03-27) as a polyfill on `navigator.modelContext`
- Provides `McpClient` for connecting to MCP servers over Streamable HTTP (JSON-RPC 2.0)
- Includes a postMessage bridge for cross-frame tool invocation
- Ships result builders and a lightweight skill registry for WebMCP tool registration

## Exports

### Polyfill

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

### MCP Client

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

// Connect (sends initialize + notifications/initialized)
const info = await client.connect();
console.log(info.serverInfo.name);

// List available tools
const tools = await client.listTools();

// Call a tool
const result = await client.callTool('get_weather', { city: 'Paris' });
console.log(result.content);

// Disconnect
await client.disconnect();
```

#### McpClient API

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | `McpInitializeResult` | Initializes the MCP session |
| `listTools()` | `McpTool[]` | Lists all tools from the server |
| `callTool(name, args?)` | `McpToolResult` | Calls a tool with optional arguments |
| `disconnect()` | `void` | Ends the session |

### postMessage bridge

```ts
import {
  listenForAgentCalls,
  stopListening,
  callToolViaPostMessage,
  isWebMCPEvent,
} from '@webmcp-auto-ui/core';
```

**`listenForAgentCalls(handler)`** — Listens for `webmcp:call-tool` events from iframes or other windows.

```ts
const cleanup = listenForAgentCalls(async (event) => {
  const result = await executeToolInternal(event.name, event.args);
  return result;
});
// later: cleanup()
```

**`callToolViaPostMessage(target, name, args)`** — Sends a tool call to a parent/child window via postMessage.

```ts
const result = await callToolViaPostMessage(window.parent, 'get_data', { id: 42 });
```

**`isWebMCPEvent(event)`** — Type guard for WebMCP postMessage events.

### Utilities

```ts
import {
  dispatchAndWait,
  signalCompletion,
  sanitizeSchema,
  createToolGroup,
} from '@webmcp-auto-ui/core';
```

**`dispatchAndWait(eventName, detail?, options?)`** — Dispatches a CustomEvent and waits for a matching completion event. Solves the "execute must return after UI updates" pattern.

**`signalCompletion(requestId, result?)`** — Fires the completion event for `dispatchAndWait`.

**`sanitizeSchema(schema)`** — Cleans a JSON Schema for Anthropic API compatibility (removes unsupported fields).

**`createToolGroup(prefix, tools)`** — Groups related tools under a common prefix for registration.

### Result builders and skill registry

```ts
import {
  textResult,
  jsonResult,
  registerSkill,
  unregisterSkill,
  getSkill,
  listSkills,
  clearSkills,
} from '@webmcp-auto-ui/core';
```

**`textResult(text)`** — Creates a `ToolExecuteResult` with a text content block.

```ts
return textResult('Operation completed successfully');
```

**`jsonResult(data)`** — Creates a `ToolExecuteResult` with JSON-stringified content.

```ts
return jsonResult({ count: 42, items: ['a', 'b'] });
```

**`registerSkill(skill)`** — Exposes a skill as a WebMCP tool on `navigator.modelContext`, making it discoverable and invocable by an agent.

```ts
registerSkill({
  id: 'weather',
  name: 'Weather Dashboard',
  description: 'Shows local weather conditions',
  component: 'WeatherDash',
});
```

### Validation

```ts
import { validateJsonSchema } from '@webmcp-auto-ui/core';

const result = validateJsonSchema(someSchema);
if (!result.valid) {
  console.error(result.errors);
}
```

## Types

All types are exported and documented via JSDoc. Key types:

- `ModelContext`, `ModelContextTool` — W3C WebMCP spec types
- `McpClient`, `McpTool`, `McpToolResult` — MCP protocol types
- `WebMCPCallToolEvent`, `PostMessageBridgeOptions` — bridge types
- `JsonSchema`, `JsonSchemaObject` — schema validation types
- `SkillDef` — skill registry entry
