// @webmcp-auto-ui/agent — types

export type ModelId = 'claude-haiku' | 'claude-sonnet' | 'gemma-e2b' | 'auto';

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
  readonly model: ModelId;
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
}

// Callbacks for streaming UI updates
export interface AgentCallbacks {
  onBlock?: (type: string, data: Record<string, unknown>) => void;
  onText?: (text: string) => void;
  onToolCall?: (call: ToolCall) => void;
  onClear?: () => void;
}
