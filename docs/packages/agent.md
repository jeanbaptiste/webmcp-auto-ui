# @webmcp-auto-ui/agent

LLM agent loop with Anthropic and Gemma providers, plus 22 UI tools for rendering blocks and a unified `component()` tool exposing 56 components.

## What it does

- Runs an iterative LLM agent loop: prompt -> tool calls -> LLM -> repeat until done
- Provides two LLM providers: `AnthropicProvider` (cloud) and `GemmaProvider` (in-browser Web Worker)
- Defines 22 `render_*` UI tools that the LLM calls to compose visual blocks on the canvas
- Bridges MCP server tools and UI tools into a unified tool set for the LLM

## Providers

### AnthropicProvider

Calls the Anthropic Claude API through a server-side proxy (SvelteKit `+server.ts`).

```ts
import { AnthropicProvider } from '@webmcp-auto-ui/agent';

const provider = new AnthropicProvider({
  proxyUrl: '/api/chat',          // your SvelteKit proxy endpoint
  model: 'claude-haiku-4-5-20251001',  // optional, defaults to Haiku
  apiKey: 'sk-ant-...',          // optional, injected as __apiKey in body
});

// Switch model at runtime
provider.setModel('claude-sonnet');
```

Built-in model mapping:

| ModelId | Anthropic model |
|---------|----------------|
| `claude-haiku` | `claude-haiku-4-5-20251001` |
| `claude-sonnet` | `claude-sonnet-4-6` |

### GemmaProvider

Runs Gemma locally in a Web Worker via Hugging Face Transformers.js. No API key needed.

```ts
import { GemmaProvider } from '@webmcp-auto-ui/agent';

const provider = new GemmaProvider({
  workerUrl: '/gemma.worker.js',
  onProgress: (pct, status) => console.log(`${pct}% — ${status}`),
  onStatusChange: (status) => console.log('Status:', status),
  // status: 'idle' | 'loading' | 'ready' | 'error'
});

await provider.initialize();  // downloads model weights on first run
```

### LLMProvider interface

Both providers implement:

```ts
interface LLMProvider {
  readonly name: string;
  readonly model: ModelId;
  chat(
    messages: ChatMessage[],
    tools: AnthropicTool[],
    options?: { signal?: AbortSignal; cacheEnabled?: boolean; system?: string }
  ): Promise<LLMResponse>;
}
```

## Agent loop

```ts
import { runAgentLoop, buildSystemPrompt, mcpToolsToAnthropic, fromMcpTools } from '@webmcp-auto-ui/agent';
```

### runAgentLoop

Runs the LLM -> tool call -> LLM cycle until `end_turn` or `maxIterations`.

```ts
const result = await runAgentLoop('Show me revenue by quarter', {
  provider,
  client: mcpClient,         // optional McpClient instance
  mcpTools: tools,           // tools from client.listTools()
  maxIterations: 10,         // default: 10
  cacheEnabled: true,        // enable prompt caching
  systemPrompt: customPrompt, // override the default system prompt
  signal: abortController.signal,
  callbacks: {
    onBlock: (type, data) => canvas.addBlock(type, data),
    onText: (text) => console.log('LLM:', text),
    onToolCall: (call) => console.log('Tool:', call.name, call.result),
    onClear: () => canvas.clearBlocks(),
  },
});

console.log(result.text);           // final LLM text
console.log(result.toolCalls);      // all tool calls made
console.log(result.metrics);        // token usage, latency, iterations
console.log(result.stopReason);     // 'end_turn' | 'max_iterations' | 'error'
```

### AgentLoopOptions

```ts
interface AgentLoopOptions {
  client?: McpClient;
  provider: LLMProvider;
  mcpTools?: McpToolDef[];
  maxIterations?: number;
  cacheEnabled?: boolean;
  systemPrompt?: string;
  callbacks?: AgentCallbacks;
  signal?: AbortSignal;
}
```

### AgentCallbacks

```ts
interface AgentCallbacks {
  onBlock?: (type: string, data: Record<string, unknown>) => void;
  onText?: (text: string) => void;
  onToolCall?: (call: ToolCall) => void;
  onClear?: () => void;
}
```

### AgentResult

```ts
interface AgentResult {
  text: string;
  toolCalls: ToolCall[];
  metrics: AgentMetrics;
  stopReason: 'end_turn' | 'max_iterations' | 'error';
}

interface AgentMetrics {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalLatencyMs: number;
  toolCalls: number;
  iterations: number;
  cacheHits: number;
}
```

### Helper functions

**`buildSystemPrompt(mcpTools)`** — Generates the default system prompt listing all DATA and UI tools available to the LLM.

**`mcpToolsToAnthropic(tools)`** — Converts MCP tool definitions to Anthropic API format (sanitizes schemas).

**`fromMcpTools(mcpTools)`** — Alias/helper for converting MCP tools for use in the agent loop.

## UI tools

22 render tools + 1 canvas action, exposed to the LLM. Each `render_*` tool maps to a block type in `@webmcp-auto-ui/ui`.

```ts
import { UI_TOOLS, isUITool, executeUITool } from '@webmcp-auto-ui/agent';
```

### Tool list

#### Simple blocks

| Tool | Block type | Required params |
|------|-----------|-----------------|
| `render_stat` | `stat` | `label`, `value` |
| `render_kv` | `kv` | `rows` (array of `[key, value]`) |
| `render_list` | `list` | `items` (string array) |
| `render_chart` | `chart` | `bars` (array of `[label, number]`) |
| `render_alert` | `alert` | `title` |
| `render_code` | `code` | `content` |
| `render_text` | `text` | `content` |
| `render_actions` | `actions` | `buttons` (array of `{ label, primary? }`) |
| `render_tags` | `tags` | `tags` (array of `{ text, active? }`) |

#### Rich widgets

| Tool | Block type | Required params |
|------|-----------|-----------------|
| `render_table` | `data-table` | `rows` |
| `render_timeline` | `timeline` | `events` (array of `{ title, date?, status? }`) |
| `render_profile` | `profile` | `name` |
| `render_trombinoscope` | `trombinoscope` | `people` (array of `{ name, subtitle?, badge? }`) |
| `render_json` | `json-viewer` | `data` (any JSON) |
| `render_hemicycle` | `hemicycle` | `groups` (array of `{ id, label, seats, color }`) |
| `render_chart_rich` | `chart-rich` | `data` (array of `{ values, label?, color? }`) |
| `render_cards` | `cards` | `cards` (array of `{ title, description? }`) |
| `render_sankey` | `sankey` | `nodes`, `links` |
| `render_log` | `log` | `entries` (array of `{ message, level?, timestamp? }`) |
| `render_gallery` | `gallery` | `images` (array of `{ src, alt?, caption? }`) |
| `render_carousel` | `carousel` | `slides` |
| `render_d3` | `d3` | `preset`, `data` |

#### Canvas actions

| Tool | Description |
|------|-------------|
| `clear_canvas` | Clears all blocks from the canvas |

### Checking and executing UI tools

```ts
if (isUITool('render_stat')) {
  const result = executeUITool('render_stat', { label: 'Users', value: '42' }, {
    onBlock: (type, data) => canvas.addBlock(type, data),
  });
  // result: "Rendered stat block"
}
```

## Unified `component()` tool

In addition to the individual `render_*` tools, the agent package provides a single unified `component()` tool that exposes **56 components** (31 renderable, 25 non-renderable) through a consistent interface.

This approach was inspired by [Emmanuel Raviart](https://www.tricoteuses.fr/mcp), creator of the Moulineuse MCP server, who suggested consolidating the tool surface into a single discoverable entry point.

```ts
import { COMPONENT_TOOL, executeComponent, componentRegistry } from '@webmcp-auto-ui/agent';
```

### Three modes

| Mode | Call | Returns |
|------|------|---------|
| **List all** | `component("help")` | Array of all 56 components with name, description, and `renderable` flag |
| **Inspect one** | `component("help", "stat-card")` | Schema, description, and renderability of a single component |
| **Render** | `component("stat-card", { label: "Revenue", value: "$142K" })` | Renders the component (renderable ones only) |

### Component categories

- **Renderable (31)** -- all `render_*` block types plus canvas actions (`clear`, `update`, `move`, `resize`, `style`). These can be rendered through the agent tool pipeline via `executeComponent`.
- **Non-renderable (25)** -- primitives, base UI components, layouts, agent UI widgets, and theme provider. These are Svelte components available for direct import from `@webmcp-auto-ui/ui`. Calling render on them returns their schema and a usage hint.

Component names use dashes (e.g., `stat-card`). The original `render_*` names are also accepted for backward compatibility.

### Coexistence with `render_*` tools

Both approaches work simultaneously. The individual `render_*` tools remain available and fully functional. The `component()` tool is an additional entry point that provides discoverability (via `help` mode) and a uniform interface.

### Custom components

The `componentRegistry` is a mutable `Map<string, ComponentEntry>`. Apps can register additional components at runtime:

```ts
import { componentRegistry, type ComponentEntry } from '@webmcp-auto-ui/agent';

componentRegistry.set('my-widget', {
  name: 'my-widget',
  toolName: 'my-widget',
  description: 'Custom widget for my app.',
  inputSchema: { type: 'object', properties: { title: { type: 'string' } } },
  renderable: false,
});
```

For the full list of all 56 components and their schemas, see [composing.md](../agents/composing.md#unified-component-tool).

## Workflow

The standard agent workflow:

1. User sends a message
2. `buildSystemPrompt` lists available DATA tools (from MCP) and UI tools
3. `runAgentLoop` sends the message + tools to the LLM
4. LLM calls a DATA tool (e.g., `query_sql`) -> forwarded to MCP server via `McpClient`
5. LLM receives data, calls a UI tool (e.g., `render_chart`) -> executed locally via callbacks
6. Block appears on the canvas via `onBlock` callback
7. Loop continues until LLM sends `end_turn`
