# @webmcp-auto-ui/agent

LLM agent loop that connects MCP and WebMCP servers to a UI. Given a user message and a set of tool layers, it runs a tool-use loop until the LLM signals it's done, calling widget tools to build the interface.

## Providers

**AnthropicProvider** — proxies to a `+server.ts` endpoint that holds the API key. Supports `claude-haiku-4-5` and `claude-sonnet-4-6`. Prompt caching enabled by default. Retry on 503 with exponential backoff. Returns stats in `LLMResponse`: tok/s, totalTokens, latencyMs.

**GemmaProvider (LiteRT)** — runs Gemma 4 models via `@mediapipe/tasks-genai` (LiteRT, formerly known as MediaPipe) directly on the **main thread**. Uses WebGPU when available. No API key required. Models are cached in **OPFS** (Origin Private File System) for instant reload after first download.

> **v0.5.0 migration**: GemmaProvider was migrated from ONNX (`@huggingface/transformers`) to LiteRT (`@mediapipe/tasks-genai`). LiteRT is 2-4x faster on WebGPU and provides native Gemma 4 support. The provider now runs on the main thread because MediaPipe is incompatible with ES module workers.

**Gemma 4 prompt format** — uses `<|turn>...<turn|>` delimiters (instead of the Gemma 2/3 `<start_of_turn>...<end_of_turn>`).

**Native tool calling** — Gemma 4 tool calls are parsed from `<|tool_call>call:name{args}<tool_call|>` format. No regex heuristics needed.

## WebMCP `autoui` server

The package ships a pre-configured WebMCP server named `autoui` with all built-in widget recipes (stat, table, chart, timeline, etc.). This replaces the previous `componentRegistry` / `ComponentAdapter` / `COMPONENT_TOOL` API.

```ts
import { autoui } from '@webmcp-auto-ui/agent';

// autoui is a WebMcpServer with all built-in widgets registered
const layer = autoui.layer();
// → { protocol: 'webmcp', serverName: 'autoui', tools: [...] }
```

## Lazy tool loading

Tools are loaded lazily via discovery. The agent initially receives only lightweight discovery tools, then activates full tool schemas on demand:

- `buildDiscoveryTools(servers)` — creates `list_components` and `get_component` tools across all WebMCP servers
- `activateServerTools(serverName)` — loads the full tool set for a specific server

This keeps the initial prompt small when many servers/widgets are available.

## Install

```bash
npm install @webmcp-auto-ui/agent
```

## Usage

```ts
import { autoui, runAgentLoop, AnthropicProvider } from '@webmcp-auto-ui/agent';

const result = await runAgentLoop('Show me sales data', {
  provider: new AnthropicProvider({ proxyUrl: '/api/chat' }),
  layers: [mcpClient.layer(), autoui.layer()],
  maxIterations: 5,
  callbacks: {
    onWidget: (type, data) => {
      // Display the widget in your UI
      return { id: widgetId };
    },
    onClear: () => { /* clear canvas */ },
    onText: (text) => { /* update chat */ },
    onToolCall: (call) => { /* log tool use */ },
  },
});
```

> **Migration from Phase 7**: `onBlock` still works as a deprecated alias for `onWidget`. The `UILayer`, `SkillLayer`, `COMPONENT_TOOL`, `executeComponent`, and `componentRegistry` exports are removed — use `autoui.layer()` instead.

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
