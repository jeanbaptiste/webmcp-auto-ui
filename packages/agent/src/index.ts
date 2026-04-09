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

export { runAgentLoop, buildSystemPrompt, mcpToolsToAnthropic, fromMcpTools, trimConversationHistory } from './loop.js';
export type { AgentLoopOptions } from './loop.js';

export { UI_TOOLS, isUITool, executeUITool } from './ui-tools.js';
export { COMPONENT_TOOL, componentRegistry, executeComponent } from './component-tool.js';
export type { ComponentEntry } from './component-tool.js';

export { summarizeChat } from './summarize.js';
export type { SummarizeOptions, ChatSummaryResult } from './summarize.js';

export { TokenTracker } from './token-tracker.js';
export type { TokenMetrics } from './token-tracker.js';

// Recipes
export { WEBMCP_RECIPES, parseRecipe, parseRecipes } from './recipes/index.js';
export { recipeRegistry, registerRecipes, filterRecipesByServer, formatRecipesForPrompt, formatMcpRecipesForPrompt } from './recipe-registry.js';

// Tool layers
export type { ToolLayer, McpLayer, UILayer } from './tool-layers.js';

export type {
  RemoteModelId, WasmModelId, LLMId, ModelId,
  ChatMessage, ContentBlock, McpToolDef, AnthropicTool,
  LLMProvider, LLMResponse, ToolCall, AgentMetrics, AgentResult, AgentCallbacks,
  Recipe, McpRecipe,
} from './types.js';
