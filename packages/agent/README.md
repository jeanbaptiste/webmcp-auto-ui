# @webmcp-auto-ui/agent

LLM agent loop that connects an MCP server to a UI. Given a user message and a set of MCP tools, it runs a tool-use loop until the LLM signals it's done, calling `render_*` tools to build the interface.

## Providers

**AnthropicProvider** — proxies to a `+server.ts` endpoint that holds the API key. Supports `claude-haiku-4-5` and `claude-sonnet-4-6`. Prompt caching enabled by default.

**GemmaProvider** — runs `gemma-4-E2B-it` in a Web Worker via `@huggingface/transformers`. Uses WebGPU with WASM fallback. No API key required. Pass a `workerFactory` function that returns a `Worker` instance (use Vite's `?worker` import).

## UI tools

19 `render_*` tools exposed to the LLM, one per block type:

`render_stat` · `render_kv` · `render_list` · `render_chart` · `render_alert` · `render_code` · `render_text` · `render_actions` · `render_tags` · `render_table` · `render_timeline` · `render_profile` · `render_trombinoscope` · `render_json` · `render_hemicycle` · `render_chart_rich` · `render_cards` · `render_sankey` · `render_log` · `clear_canvas`

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

## Gemma E2B

```ts
import GemmaWorker from '$lib/gemma.worker.ts?worker'; // Vite worker import
import { GemmaProvider } from '@webmcp-auto-ui/agent';

const provider = new GemmaProvider({
  workerFactory: () => new GemmaWorker(),
  onProgress: (pct, status) => console.log(status, pct),
  onStatusChange: (s) => console.log(s), // 'loading' | 'ready' | 'error'
});
```

Requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for `SharedArrayBuffer` support.

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
