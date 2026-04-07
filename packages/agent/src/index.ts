// @webmcp-auto-ui/agent — public API

// New providers (prefer these)
export { RemoteLLMProvider } from './providers/remote.js';
export type { RemoteLLMProviderOptions } from './providers/remote.js';

export { WasmProvider } from './providers/wasm.js';
export type { WasmProviderOptions, WasmStatus } from './providers/wasm.js';

export { LocalLLMProvider } from './providers/local.js';
export type { LocalLLMProviderOptions, LocalBackend } from './providers/local.js';

export { createProvider } from './providers/factory.js';
export type { LLMConfig } from './providers/factory.js';

// Backward-compat aliases
export { AnthropicProvider } from './providers/anthropic.js';
export type { AnthropicProviderOptions } from './providers/anthropic.js';

export { GemmaProvider } from './providers/gemma.js';
export type { GemmaProviderOptions, GemmaStatus } from './providers/gemma.js';

export { runAgentLoop, buildSystemPrompt, mcpToolsToAnthropic, fromMcpTools } from './loop.js';
export type { AgentLoopOptions } from './loop.js';

export { UI_TOOLS, isUITool, executeUITool } from './ui-tools.js';

export type {
  RemoteModelId, WasmModelId, LLMId, ModelId,
  ChatMessage, ContentBlock, McpToolDef, AnthropicTool,
  LLMProvider, LLMResponse, ToolCall, AgentMetrics, AgentResult, AgentCallbacks,
} from './types.js';
