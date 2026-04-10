---
title: "@webmcp-auto-ui/agent"
description: LLM agent loop with providers, ToolLayers, WebMCP recipes, unified component() and TokenTracker
sidebar:
  order: 1
---

LLM agent loop with 4 providers (Anthropic, Gemma LiteRT, Ollama, Llamafile), structured ToolLayers, WebMCP recipes, unified `component()` (56 components), TokenTracker and summarizeChat.

## Providers

### RemoteLLMProvider

Unified provider for cloud APIs (Anthropic and compatible). Replaces `AnthropicProvider` (which remains available as an alias).

```ts
import { RemoteLLMProvider } from '@webmcp-auto-ui/agent';

const provider = new RemoteLLMProvider({
  proxyUrl: '/api/chat',
  model: 'haiku',          // 'haiku' | 'sonnet' | 'opus' | string
  apiKey: 'sk-ant-...',    // optional
});
```

### WasmProvider

Unified provider for in-browser WASM models. Replaces `GemmaProvider` (which remains available as an alias).

```ts
import { WasmProvider } from '@webmcp-auto-ui/agent';

const provider = new WasmProvider({
  model: 'gemma-e2b',      // 'gemma-e2b' | 'gemma-e4b' | string
  onProgress: (pct, status, loaded, total) => console.log(`${pct}%`),
  onStatusChange: (status) => console.log(status),
});
```

Runs on the main thread via `@mediapipe/tasks-genai` (LiteRT). WebGPU when available. OPFS cache.

### LocalLLMProvider

Provider for local LLMs via OpenAI-compatible API (Ollama, Llamafile, LM Studio).

```ts
import { LocalLLMProvider } from '@webmcp-auto-ui/agent';

const provider = new LocalLLMProvider({
  baseUrl: 'http://localhost:11434',  // Ollama
  model: 'llama3.2',
  backend: 'ollama',                  // 'ollama' | 'llamafile' | 'lm-studio'
});
```

### createProvider (factory)

```ts
import { createProvider, type LLMConfig } from '@webmcp-auto-ui/agent';

const config: LLMConfig = { type: 'remote', model: 'sonnet', proxyUrl: '/api/chat' };
const provider = createProvider(config);
```

### LLMProvider interface

```ts
interface LLMProvider {
  readonly name: string;
  readonly model: string;
  chat(
    messages: ChatMessage[],
    tools: AnthropicTool[],
    options?: {
      signal?: AbortSignal;
      cacheEnabled?: boolean;
      system?: string;
      temperature?: number;
      topK?: number;
      maxTokens?: number;
      onToken?: (token: string) => void;
    }
  ): Promise<LLMResponse>;
}
```

## Agent loop

### runAgentLoop

```ts
import { runAgentLoop } from '@webmcp-auto-ui/agent';

const result = await runAgentLoop('Show me revenue by quarter', {
  provider,
  layers: [mcpLayer, uiLayer],
  toolMode: 'smart',
  maxIterations: 5,
  cacheEnabled: true,
  initialMessages: history,
  callbacks: {
    onBlock: (type, data) => canvas.addBlock(type, data),
    onText: (text) => console.log('LLM:', text),
    onToolCall: (call) => console.log('Tool:', call.name),
    onToken: (token) => process.stdout.write(token),
  },
  signal: abortController.signal,
});
```

### AgentLoopOptions

```ts
interface AgentLoopOptions {
  provider: LLMProvider;
  client?: McpClient;
  mcpTools?: McpToolDef[];       // legacy -- prefer layers
  layers?: ToolLayer[];          // new API
  toolMode?: 'smart' | 'explicit';
  maxIterations?: number;        // default: 5
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  cacheEnabled?: boolean;
  systemPrompt?: string;         // override the auto-generated prompt
  initialMessages?: ChatMessage[];
  callbacks?: AgentCallbacks;
  signal?: AbortSignal;
}
```

### AgentCallbacks

```ts
interface AgentCallbacks {
  onIterationStart?: (iteration: number, maxIterations: number) => void;
  onLLMRequest?: (messages: ChatMessage[], tools: AnthropicTool[]) => void;
  onLLMResponse?: (response: LLMResponse, latencyMs: number, tokens?: { input: number; output: number }) => void;
  onToolCall?: (call: ToolCall) => void;
  onBlock?: (type: string, data: Record<string, unknown>) => { id: string } | void;
  onClear?: () => void;
  onText?: (text: string) => void;
  onToken?: (token: string) => void;
  onDone?: (metrics: AgentMetrics) => void;
  onUpdate?: (id: string, data: Record<string, unknown>) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, w: number, h: number) => void;
  onStyle?: (id: string, styles: Record<string, string>) => void;
}
```

## ToolLayers

### Types

```ts
interface McpLayer {
  source: 'mcp';
  serverUrl: string;
  serverName?: string;
  tools: McpToolDef[];
  recipes?: McpRecipe[];
}

interface UILayer {
  source: 'ui';
  adapter?: ComponentAdapter;
  recipes?: Recipe[];
}

type ToolLayer = McpLayer | UILayer;
```

### buildToolsFromLayers

```ts
import { buildToolsFromLayers } from '@webmcp-auto-ui/agent';

const tools = buildToolsFromLayers(layers, 'smart');
```

### buildSystemPrompt

```ts
import { buildSystemPrompt } from '@webmcp-auto-ui/agent';

const prompt = buildSystemPrompt(layers, { toolMode: 'smart' });
```

## Unified component()

Single tool exposing 56 components (31 renderable, 25 non-renderable).

```ts
import { COMPONENT_TOOL, executeComponent, componentRegistry } from '@webmcp-auto-ui/agent';
```

### Three call modes

| Call | Return |
|------|--------|
| `component("help")` | List of 56 components |
| `component("help", "stat-card")` | Schema + description of a component |
| `component("stat-card", { label: "Revenue", value: "$142K" })` | Renders the component |

## ComponentAdapter

```ts
import { ComponentAdapter, minimalPreset, nativePreset, allNativePreset } from '@webmcp-auto-ui/agent';

const adapter = new ComponentAdapter();
adapter.registerAll(minimalPreset());  // stat, kv, chart, table, text + clear, update

const uiLayer: UILayer = { source: 'ui', adapter, recipes: myRecipes };
```

### Component groups

| Group | Components |
|-------|-----------|
| `simple` | stat, kv, list, chart, alert, code, text, actions, tags |
| `rich` | table, timeline, profile, trombinoscope, json, hemicycle, chart-rich, cards, sankey, log, stat-card, grid |
| `media` | gallery, carousel, map |
| `advanced` | d3, js-sandbox |
| `canvas` | clear, update, move, resize, style |

## WebMCP Recipes

```ts
import {
  WEBMCP_RECIPES,
  parseRecipe,
  filterRecipesByServer,
  formatRecipesForPrompt,
} from '@webmcp-auto-ui/agent';

const relevant = filterRecipesByServer(WEBMCP_RECIPES, ['tricoteuses']);
const text = formatRecipesForPrompt(relevant);
```

## Utilities

### TokenTracker

```ts
import { TokenTracker } from '@webmcp-auto-ui/agent';

const tracker = new TokenTracker();
tracker.record({ inputTokens: 500, outputTokens: 120, cached: 400, latencyMs: 850 });
console.log(tracker.stats);
```

### summarizeChat

```ts
import { summarizeChat } from '@webmcp-auto-ui/agent';

const summary = summarizeChat(messages);
// Anonymized summary without PII for HyperSkill provenance
```

### trimConversationHistory

```ts
import { trimConversationHistory } from '@webmcp-auto-ui/agent';

const trimmed = trimConversationHistory(messages, 4096);
```
