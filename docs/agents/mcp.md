# MCP Integration -- Agent Guide

> This document is designed to be injected into an AI agent's context. It contains everything needed to connect and use MCP (Model Context Protocol) servers with webmcp-auto-ui.

## What is MCP?

MCP (Model Context Protocol) is a JSON-RPC 2.0 protocol that allows AI agents and applications to discover and call tools exposed by remote servers. In webmcp-auto-ui, MCP is the bridge between data sources and the UI: you connect to an MCP server, list its tools, call them to fetch data, and display results using UI blocks.

## Architecture Overview

```
User prompt --> Agent Loop --> LLM (Claude/Gemma)
                  |                    |
                  |              tool_use blocks
                  |                    |
                  v                    v
              MCP Client -------> MCP Server (remote)
                  |                    |
              tool results        data/actions
                  |
                  v
              UI Blocks (stat, chart, table, etc.)
```

## McpClient API

The `McpClient` class (from `@webmcp-auto-ui/core`) handles the full MCP lifecycle.

### Connecting

```typescript
import { McpClient } from '@webmcp-auto-ui/core';

const client = new McpClient('https://mcp.example.com/mcp', {
  clientName: 'my-app',
  clientVersion: '1.0.0',
  timeout: 30000,
  headers: {
    'Authorization': 'Bearer <token>'  // optional
  },
  autoReconnect: true,
  maxReconnectAttempts: 3
});

// Initialize the connection (required before any other call)
const initResult = await client.connect();
// initResult: { protocolVersion, capabilities, serverInfo }
```

### Listing Tools

```typescript
const tools = await client.listTools();
// tools: McpTool[]
// Each tool: { name, description, inputSchema, outputSchema, annotations }
```

### Calling a Tool

```typescript
const result = await client.callTool('query_sql', {
  sql: 'SELECT name, revenue FROM products ORDER BY revenue DESC LIMIT 5'
});
// result: { content: [{ type: 'text', text: '...' }], isError?: boolean }
```

### Disconnecting

```typescript
await client.disconnect();
```

## Transport: Streamable HTTP

The MCP client uses HTTP POST with JSON-RPC 2.0 payloads:

- **Content-Type**: `application/json`
- **Accept**: `application/json, text/event-stream`
- **Session management**: The server returns an `Mcp-Session-Id` header on first request. The client sends it back on subsequent requests.
- **Auto-reconnect**: If the server returns 404 (session expired), the client automatically re-initializes with exponential backoff (500ms * attempt).
- **SSE responses**: The server may respond with `text/event-stream`. The client parses `data:` lines and extracts the last complete JSON-RPC response.

### Request Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "query_sql",
    "arguments": { "sql": "SELECT 1" }
  }
}
```

### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{ "type": "text", "text": "[{\"id\":1}]" }]
  }
}
```

## MCP Tool Shape

```typescript
interface McpTool {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;   // JSON Schema for parameters
  outputSchema?: JsonSchema;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}
```

## Integrating MCP in a Skill

A skill can reference an MCP server via the `mcp` and `mcpName` fields:

```json
{
  "name": "sales-dashboard",
  "mcp": "https://mcp.example.com/mcp",
  "mcpName": "sales-api",
  "blocks": [
    { "type": "stat", "data": { "label": "Revenue", "value": "$142K" } }
  ]
}
```

When a skill has an `mcp` field, the runtime:
1. Creates an `McpClient` and connects to the URL
2. Lists available tools
3. Makes them available to the agent loop alongside UI tools

## The Agent Loop Pattern

The `runAgentLoop` function orchestrates LLM + MCP + UI:

```typescript
import { McpClient } from '@webmcp-auto-ui/core';
import { runAgentLoop, fromMcpTools } from '@webmcp-auto-ui/agent';

// 1. Connect to MCP
const client = new McpClient('https://mcp.example.com/mcp');
await client.connect();
const tools = await client.listTools();

// 2. Run the agent loop
const result = await runAgentLoop('Show me top 5 products by revenue', {
  client,
  provider: myLLMProvider,    // LLMProvider implementation
  mcpTools: fromMcpTools(tools),
  maxIterations: 5,
  callbacks: {
    onBlock: (type, data) => { /* add block to UI */ },
    onText: (text) => { /* display assistant text */ },
    onToolCall: (call) => { /* log tool call */ }
  }
});
```

The loop works as follows:
1. Sends user message + system prompt to LLM
2. LLM returns tool_use blocks (DATA tools or UI tools)
3. DATA tools are executed via `client.callTool()`
4. UI tools are executed locally via callbacks (`onBlock`, `onClear`)
5. Tool results are sent back to LLM
6. Repeat until LLM returns `end_turn` or max iterations reached

### System Prompt

The auto-generated system prompt tells the LLM:
- Which DATA tools are available (from MCP server)
- Which UI tools are available (stat, chart, table, etc.)
- The mandatory workflow: fetch data first, then display with UI tools

> **Tip**: In addition to individual `render_*` tools, the unified `component()` tool provides a single entry point for all 56 UI components (31 renderable, 25 non-renderable). The LLM can call `component("help")` to discover available components at runtime. See the [agent package docs](../packages/agent.md#unified-component-tool) for details.

## Auto-Generated UI Pattern

Connect MCP, list tools, and let the agent auto-generate the UI:

1. User connects to an MCP server URL
2. App calls `client.listTools()` to discover available tools
3. User types a natural language query
4. Agent loop calls MCP tools to fetch data, then UI tools to render blocks
5. Result: a fully generated dashboard without manual block composition

## Example: Connect and Generate

```typescript
// Connect to code4code MCP server
const client = new McpClient('https://mcp.code4code.eu/mcp');
await client.connect();

console.log('Server:', client.getServerInfo());
// { name: "code4code", version: "1.0.0" }

const tools = await client.listTools();
console.log('Available tools:', tools.map(t => t.name));
// ["query_sql", "list_tables", "describe_table", "search_recipes", ...]

// Run agent loop with a user query
const result = await runAgentLoop('List all recipes with their ratings', {
  client,
  provider: claudeProvider,
  mcpTools: fromMcpTools(tools),
  callbacks: {
    onBlock: (type, data) => blocks.push({ type, data }),
    onText: (text) => console.log('Assistant:', text)
  }
});

// result.toolCalls shows what the agent did:
// 1. Called query_sql to fetch recipes
// 2. Called ui_data_table to display results
```

## Authentication

MCP servers can require authentication. Pass a Bearer token in the headers:

```typescript
const client = new McpClient('https://mcp.example.com/mcp', {
  headers: {
    'Authorization': 'Bearer eyJhbGci...'
  }
});
```

The token is sent with every request (initialize, tools/list, tools/call).

## McpClient Options

```typescript
interface McpClientOptions {
  clientName?: string;            // default: 'webmcp-auto-ui'
  clientVersion?: string;         // default: '0.1.0'
  timeout?: number;               // request timeout in ms, default: 30000
  headers?: Record<string, string>; // extra headers (auth, etc.)
  autoReconnect?: boolean;        // reconnect on 404, default: true
  maxReconnectAttempts?: number;  // default: 3
}
```

## Constraints

- The MCP server must support Streamable HTTP transport (POST with JSON-RPC 2.0).
- `connect()` must be called before `listTools()` or `callTool()`.
- Tool results are text-based (`content[].type === 'text'`). Parse JSON from `content[0].text` if needed.
- The agent loop truncates tool results to 10,000 characters to fit LLM context windows.
- CORS: the MCP server must allow requests from your domain.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Calling `listTools()` before `connect()` | Error: session not initialized | Always call `connect()` first |
| Missing `Authorization` header | 401 or 403 from server | Pass Bearer token in `headers` option |
| Ignoring `isError` on tool results | Silent failures, incorrect data displayed | Check `result.isError` before using content |
| Not handling SSE responses | Client hangs or parses incorrectly | The McpClient handles SSE automatically -- no action needed |
| Setting `timeout` too low for slow tools | Request aborted mid-execution | Increase `timeout` for heavy queries (60000+) |
| Not calling `disconnect()` | Session leaks on server side | Call `disconnect()` when done or on component unmount |
