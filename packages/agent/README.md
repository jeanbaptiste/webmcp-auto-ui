# @webmcp-auto-ui/agent

LLM agent loop that connects an MCP server to a UI. Given a user message and a set of MCP tools, it runs a tool-use loop until the LLM signals it's done, calling `render_*` tools to build the interface.

## Providers

**AnthropicProvider** — proxies to a `+server.ts` endpoint that holds the API key. Supports `claude-haiku-4-5` and `claude-sonnet-4-6`. Prompt caching enabled by default. Retry on 503 with exponential backoff. Returns stats in `LLMResponse`: tok/s, totalTokens, latencyMs.

**GemmaProvider (LiteRT)** — runs Gemma 4 models via `@mediapipe/tasks-genai` (LiteRT, formerly known as MediaPipe) directly on the **main thread**. Uses WebGPU when available. No API key required. Models are cached in **OPFS** (Origin Private File System) for instant reload after first download.

> **v0.5.0 migration**: GemmaProvider was migrated from ONNX (`@huggingface/transformers`) to LiteRT (`@mediapipe/tasks-genai`). LiteRT is 2-4x faster on WebGPU and provides native Gemma 4 support. The provider now runs on the main thread because MediaPipe is incompatible with ES module workers.

**Gemma 4 prompt format** — uses `<|turn>...<turn|>` delimiters (instead of the Gemma 2/3 `<start_of_turn>...<end_of_turn>`).

**Native tool calling** — Gemma 4 tool calls are parsed from `<|tool_call>call:name{args}<tool_call|>` format. No regex heuristics needed.

## UI tools

19 `render_*` tools exposed to the LLM, one per block type:

`render_stat` · `render_kv` · `render_list` · `render_chart` · `render_alert` · `render_code` · `render_text` · `render_actions` · `render_tags` · `render_table` · `render_timeline` · `render_profile` · `render_trombinoscope` · `render_json` · `render_hemicycle` · `render_chart_rich` · `render_cards` · `render_sankey` · `render_log` · `clear_canvas`

## Unified `component()` tool

A single tool that exposes **56 components** (31 renderable, 25 non-renderable) through a consistent interface. Inspired by [Emmanuel Raviart](https://www.tricoteuses.fr/mcp), creator of the Moulineuse MCP server.

```ts
import { COMPONENT_TOOL, executeComponent, componentRegistry } from '@webmcp-auto-ui/agent';
```

Three modes:
- `component("help")` -- list all 56 components
- `component("help", "stat-card")` -- get the schema for one component
- `component("stat-card", { label: "Revenue", value: "$142K" })` -- render it

Coexists with the individual `render_*` tools -- both work simultaneously. For the full component catalogue, see `docs/agents/composing.md`.

## Install

```bash
npm install @webmcp-auto-ui/agent
```

## Usage

```ts
import { runAgentLoop, AnthropicProvider, fromMcpTools } from '@webmcp-auto-ui/agent';

const result = await runAgentLoop('Show me sales data', {
  client,                          // McpClient from @webmcp-auto-ui/core
  provider: new AnthropicProvider({ proxyUrl: '/api/chat' }),
  mcpTools: fromMcpTools(tools),   // convert McpTool[] from client.listTools()
  maxIterations: 5,
  callbacks: {
    onBlock: (type, data) => { /* mount component */ },
    onClear: () => { /* clear canvas */ },
    onText: (text) => { /* update chat */ },
    onToolCall: (call) => { /* log tool use */ },
  },
});
```

## TokenTracker

Real-time usage metrics tracking across requests:

```ts
import { TokenTracker } from '@webmcp-auto-ui/agent';

const tracker = new TokenTracker();
tracker.record({ inputTokens: 500, outputTokens: 120, cached: 400, latencyMs: 850 });

console.log(tracker.stats);
// { reqPerMin, inputPerMin, outputPerMin, cachedPerMin, totalRequests, totalInput, totalOutput }
```

Used by the `TokenBubble` UI component for live dashboard metrics.

## summarizeChat

Generates an anonymized summary of a chat conversation for inclusion in HyperSkill exports:

```ts
import { summarizeChat } from '@webmcp-auto-ui/agent';

const summary = summarizeChat(messages);
// Returns a short text summary without PII or raw message content
```

## Per-request configuration

`temperature`, `topK`, and `maxTokens` can be set per-request via provider options:

```ts
const response = await provider.chat(messages, tools, {
  temperature: 0.7,
  topK: 40,
  maxTokens: 2048,
});
```

## Prompt clipping

`sizeInTokens(text)` estimates the token count for a string. Used internally to clip long prompts before sending to the LLM.

## Gemma LiteRT

```ts
import { GemmaProvider } from '@webmcp-auto-ui/agent';

const provider = new GemmaProvider({
  model: 'gemma-e2b',
  onProgress: (pct, status, loaded, total) => console.log(status, pct),
  onStatusChange: (s) => console.log(s), // 'loading' | 'ready' | 'error'
});
```

Requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` headers for WebGPU support. Models are cached in OPFS after first download for instant subsequent loads.

## API proxy (`+server.ts`)

The `AnthropicProvider` sends requests to a local endpoint. The endpoint reads `ANTHROPIC_API_KEY` from the environment, or from `body.__apiKey` as a fallback (for cases where the key is provided at runtime).

```ts
// src/routes/api/chat/+server.ts
import { env } from '$env/dynamic/private';
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const apiKey = body.__apiKey || env.ANTHROPIC_API_KEY;
  delete body.__apiKey;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return Response.json(await res.json());
};
```

## License

AGPL-3.0-or-later
