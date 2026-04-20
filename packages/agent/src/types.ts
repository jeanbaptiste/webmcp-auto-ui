// @webmcp-auto-ui/agent — types

// Re-export recipe types
export type { Recipe, McpRecipe } from './recipes/types.js';

// Short model IDs for remote (Anthropic-compatible) providers
export type RemoteModelId = 'haiku' | 'sonnet' | 'opus' | string;

// Model IDs for in-browser WASM providers (MediaPipe/LiteRT)
export type WasmModelId = 'gemma-e2b' | 'gemma-e4b' | string;

// Model IDs for in-browser transformers.js providers (ONNX + WebGPU)
// Canonical list in ./providers/transformers-models.ts.
export type TransformersModelId =
  | 'transformers-gemma-4-e2b'
  | 'transformers-gemma-4-e4b'
  | 'transformers-qwen-3-4b'
  | 'transformers-qwen-3.5-2b'
  | 'transformers-qwen-3.5-4b'
  | 'transformers-ministral-3-3b'
  | string;

// Union of all LLM IDs used by canvas.llm and LLMSelector
export type LLMId = RemoteModelId | WasmModelId | TransformersModelId;

// Backward compat alias
export type ModelId = LLMId;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentBlock[];
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

export interface McpToolDef {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface ProviderTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  strict?: boolean;  // Strict tool use — grammar-constrained sampling (provider-dependent)
}

export interface LLMResponse {
  content: ContentBlock[];
  stopReason: string;
  usage?: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };
  stats?: { tokensPerSec: number; totalTokens: number; latencyMs: number };
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  /** Hint for system prompt builders: which syntax this provider expects for tool
   *  references. `undefined` → treated as `'generic'`. Providers using a non-standard
   *  native call syntax (e.g. Gemma, Qwen ChatML, Mistral [INST]) should set this so
   *  the agent loop can build the prompt with the correct formatting. */
  readonly promptKind?: 'generic' | 'gemma' | 'qwen' | 'mistral';
  chat(
    messages: ChatMessage[],
    tools: ProviderTool[],
    options?: { signal?: AbortSignal; cacheEnabled?: boolean; system?: string; maxTokens?: number; temperature?: number; topK?: number; onToken?: (token: string) => void }
  ): Promise<LLMResponse>;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  error?: string;
  elapsed?: number;
}

export interface AgentMetrics {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalLatencyMs: number;
  toolCalls: number;
  iterations: number;
  cacheHits: number;
}

export interface AgentResult {
  text: string;
  toolCalls: ToolCall[];
  metrics: AgentMetrics;
  stopReason: 'end_turn' | 'max_iterations';
  messages: ChatMessage[]; // full conversation including this turn, for history
}

// Callbacks for streaming UI updates
export interface AgentCallbacks {
  onIterationStart?: (iteration: number, maxIterations: number) => void;
  onLLMRequest?: (messages: ChatMessage[], tools: ProviderTool[]) => void;
  onLLMResponse?: (response: LLMResponse, latencyMs: number, tokens?: { input: number; output: number }) => void;
  onToolCall?: (call: ToolCall) => void;
  /** Called when a widget_display renders a widget. Return { id } so the LLM knows the block id.
   * @param serverName - the WebMCP server that produced the widget (e.g. "chartjs", "d3") */
  onWidget?: (type: string, data: Record<string, unknown>, serverName?: string) => { id: string } | void;
  onClear?: () => void;
  onText?: (text: string) => void;
  onToken?: (token: string) => void;
  /** Called for pipeline trace / auto-repair / nano-rag diagnostics (not streamed to UI) */
  onTrace?: (message: string) => void;
  onDone?: (metrics: AgentMetrics) => void;
  // Canvas mutation tools
  onUpdate?: (id: string, data: Record<string, unknown>) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, w: number, h: number) => void;
  onStyle?: (id: string, styles: Record<string, string>) => void;
  /** Called when a widget interaction should be injected into the conversation */
  onUserInteraction?: (widgetId: string, widgetType: string, action: string, payload: unknown) => void;
}
