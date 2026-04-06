// @webmcp-auto-ui/agent — public API

export { AnthropicProvider } from './providers/anthropic.js';
export type { AnthropicProviderOptions } from './providers/anthropic.js';

export { GemmaProvider } from './providers/gemma.js';
export type { GemmaProviderOptions, GemmaStatus } from './providers/gemma.js';

export { runAgentLoop, buildSystemPrompt, mcpToolsToAnthropic, fromMcpTools } from './loop.js';
export type { AgentLoopOptions } from './loop.js';

export { UI_TOOLS, isUITool, executeUITool } from './ui-tools.js';

export type {
  ModelId, ChatMessage, ContentBlock, McpToolDef, AnthropicTool,
  LLMProvider, LLMResponse, ToolCall, AgentMetrics, AgentResult, AgentCallbacks,
} from './types.js';
