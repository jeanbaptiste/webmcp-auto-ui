---
title: "@webmcp-auto-ui/agent"
description: Boucle agent LLM avec providers, ToolLayers, recettes WebMCP, component() unifie et TokenTracker
sidebar:
  order: 1
---

Boucle agent LLM avec 4 providers (Anthropic, Gemma LiteRT, Ollama, Llamafile), ToolLayers structures, recettes WebMCP, `component()` unifie (56 composants), TokenTracker et summarizeChat.

## Providers

### RemoteLLMProvider

Provider unifie pour les API cloud (Anthropic et compatibles). Remplace `AnthropicProvider` (qui reste disponible en alias).

```ts
import { RemoteLLMProvider } from '@webmcp-auto-ui/agent';

const provider = new RemoteLLMProvider({
  proxyUrl: '/api/chat',
  model: 'haiku',          // 'haiku' | 'sonnet' | 'opus' | string
  apiKey: 'sk-ant-...',    // optionnel
});
```

### WasmProvider

Provider unifie pour les modeles WASM in-browser. Remplace `GemmaProvider` (qui reste disponible en alias).

```ts
import { WasmProvider } from '@webmcp-auto-ui/agent';

const provider = new WasmProvider({
  model: 'gemma-e2b',      // 'gemma-e2b' | 'gemma-e4b' | string
  onProgress: (pct, status, loaded, total) => console.log(`${pct}%`),
  onStatusChange: (status) => console.log(status),
});
```

Tourne sur le main thread via `@mediapipe/tasks-genai` (LiteRT). WebGPU si disponible. Cache OPFS.

### LocalLLMProvider

Provider pour les LLM locaux via API OpenAI-compatible (Ollama, Llamafile, LM Studio).

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

const result = await runAgentLoop('Montre-moi le CA par trimestre', {
  provider,
  layers: [mcpLayer, uiLayer],   // nouvelle API
  toolMode: 'smart',
  maxIterations: 5,
  cacheEnabled: true,
  initialMessages: history,       // historique conversation
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
  layers?: ToolLayer[];          // nouvelle API
  toolMode?: 'smart' | 'explicit';
  maxIterations?: number;        // default: 5
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  cacheEnabled?: boolean;
  systemPrompt?: string;         // override le prompt auto-genere
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

## component() unifie

Tool unique exposant 56 composants (31 renderable, 25 non-renderable).

```ts
import { COMPONENT_TOOL, executeComponent, componentRegistry } from '@webmcp-auto-ui/agent';
```

### Trois outils

| Outil | Retour |
|-------|--------|
| `list_components()` | Liste des 56 composants + recettes |
| `get_component("stat-card")` | Schema JSON detaille + description |
| `component("stat-card", { label: "Revenue", value: "$142K" })` | Rend le composant |

## ComponentAdapter

```ts
import { ComponentAdapter, nativePreset, allNativePreset, minimalPreset } from '@webmcp-auto-ui/agent';

const adapter = new ComponentAdapter();
adapter.registerAll(minimalPreset());  // stat, kv, chart, table, text + clear, update

const uiLayer: UILayer = { source: 'ui', adapter, recipes: myRecipes };
```

### Groupes de composants

| Groupe | Composants |
|--------|-----------|
| `simple` | stat, kv, list, chart, alert, code, text, actions, tags |
| `rich` | table, timeline, profile, trombinoscope, json, hemicycle, chart-rich, cards, sankey, log, stat-card, grid |
| `media` | gallery, carousel, map |
| `advanced` | d3, js-sandbox |
| `canvas` | clear, update, move, resize, style |

## Recettes WebMCP

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

## Utilitaires

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
// Resume anonymise sans PII pour la provenance HyperSkill
```

### trimConversationHistory

```ts
import { trimConversationHistory } from '@webmcp-auto-ui/agent';

const trimmed = trimConversationHistory(messages, 4096);
```

## Exports complets

```ts
// Providers
export { RemoteLLMProvider, WasmProvider, LocalLLMProvider, createProvider };
export { AnthropicProvider, GemmaProvider };  // backward compat

// Agent loop
export { runAgentLoop, buildSystemPrompt, mcpToolsToAnthropic, fromMcpTools, trimConversationHistory };

// UI tools
export { UI_TOOLS, isUITool, executeUITool };
export { COMPONENT_TOOL, executeComponent, componentRegistry };

// Recettes
export { WEBMCP_RECIPES, parseRecipe, parseRecipes };
export { recipeRegistry, registerRecipes, filterRecipesByServer, formatRecipesForPrompt, formatMcpRecipesForPrompt };

// Tool layers
export { buildToolsFromLayers };
export type { ToolLayer, McpLayer, UILayer };

// Component adapter
export { ComponentAdapter, nativePreset, allNativePreset, minimalPreset };
export type { ComponentDef };

// Utilitaires
export { TokenTracker, summarizeChat };
```
