// @webmcp-auto-ui/agent — types

// Short model IDs for remote (Anthropic-compatible) providers
export type RemoteModelId = 'haiku' | 'sonnet' | 'opus' | string;

// Model IDs for in-browser WASM providers
export type WasmModelId = 'gemma-e2b' | 'gemma-e4b' | string;

// Union of all LLM IDs used by canvas.llm and LLMSelector
export type LLMId = RemoteModelId | WasmModelId;

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

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface LLMResponse {
  content: ContentBlock[];
  stopReason: string;
  usage?: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  chat(
    messages: ChatMessage[],
    tools: AnthropicTool[],
    options?: { signal?: AbortSignal; cacheEnabled?: boolean; system?: string }
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
  stopReason: 'end_turn' | 'max_iterations' | 'error';
  messages: ChatMessage[]; // full conversation including this turn, for history
}

// Callbacks for streaming UI updates
export interface AgentCallbacks {
  onIterationStart?: (iteration: number, maxIterations: number) => void;
  onLLMRequest?: (messages: ChatMessage[], tools: AnthropicTool[]) => void;
  onLLMResponse?: (response: LLMResponse, latencyMs: number, tokens?: { input: number; output: number }) => void;
  onToolCall?: (call: ToolCall) => void;
  onBlock?: (type: string, data: Record<string, unknown>) => void;
  onClear?: () => void;
  onText?: (text: string) => void;
  onDone?: (metrics: AgentMetrics) => void;
}
