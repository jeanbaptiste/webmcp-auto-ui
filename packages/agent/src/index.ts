// @webmcp-auto-ui/agent — public API

// Providers
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

// Agent loop
export { runAgentLoop, toProviderTools, mcpToolsToAnthropic, fromMcpTools, trimConversationHistory } from './loop.js';
export { buildSystemPrompt } from './tool-layers.js';
export type { AgentLoopOptions } from './loop.js';

// autoui — built-in WebMCP server
export { autoui, NATIVE_WIDGET_NAMES } from './autoui-server.js';

// Tool layers
export { buildToolsFromLayers, buildDiscoveryTools, buildDiscoveryToolsWithAliases, activateServerTools, resolveCanonicalTools, toolAliasMap, buildSystemPromptWithAliases, flattenPathMaps } from './tool-layers.js';
export type { ToolLayer, McpLayer, WebMcpLayer, SystemPromptResult, DiscoveryToolsResult, SchemaTransformOptions } from './tool-layers.js';

// Re-export core WebMCP types
export type { WebMcpServer, WebMcpToolDef, WidgetEntry } from '@webmcp-auto-ui/core';

// Recipes
export { WEBMCP_RECIPES, parseRecipe, parseRecipes } from './recipes/index.js';
export { recipeRegistry, registerRecipes, filterRecipesByServer, formatRecipesForPrompt, formatMcpRecipesForPrompt } from './recipe-registry.js';

// Summarize
export { summarizeChat } from './summarize.js';
export type { SummarizeOptions, ChatSummaryResult } from './summarize.js';

// Token tracker
export { TokenTracker } from './token-tracker.js';
export type { TokenMetrics } from './token-tracker.js';

// Types
export type {
  RemoteModelId, WasmModelId, LLMId, ModelId,
  ChatMessage, ContentBlock, McpToolDef, ProviderTool, AnthropicTool,
  LLMProvider, LLMResponse, ToolCall, AgentMetrics, AgentResult, AgentCallbacks,
  Recipe, McpRecipe,
} from './types.js';
