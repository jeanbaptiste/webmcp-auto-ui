# @webmcp-auto-ui/core

W3C WebMCP Draft 2026-03-27 polyfill and MCP Streamable HTTP client. Pure TypeScript, zero runtime dependencies.

## What's in here

**Polyfill** — implements `navigator.modelContext` for browsers that don't have native WebMCP support yet. Degrades gracefully when the API is unavailable.

**McpClient** — connects to MCP servers over Streamable HTTP (SSE). Handles `initialize`, `tools/list`, and `tools/call`.

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

// Cleanup
stop();
group.abort();
```

## Types

All types follow the W3C WebMCP Draft 2026-03-27 spec. See `src/types.ts`.

## License

AGPL-3.0-or-later
