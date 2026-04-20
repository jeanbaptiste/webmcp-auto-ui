// @webmcp-auto-ui/agent — public API

// Providers
export { RemoteLLMProvider } from './providers/remote.js';
export type { RemoteLLMProviderOptions } from './providers/remote.js';
export { WasmProvider } from './providers/wasm.js';
export type { WasmProviderOptions, WasmStatus } from './providers/wasm.js';
export { TransformersProvider } from './providers/transformers.js';
export type { TransformersProviderOptions, TransformersStatus } from './providers/transformers.js';
export { TRANSFORMERS_MODELS, getTransformersModel, listTransformersModels } from './providers/transformers-models.js';
export type { TransformersModelEntry, TransformersFamily, ToolCallFormat } from './providers/transformers-models.js';
export { parseToolCalls } from './prompts/tool-call-parsers.js';
export type { ParseResult } from './prompts/tool-call-parsers.js';
export { loadOrDownloadModel, clearModelCache } from './util/opfs-cache.js';
export type { ModelFileSpec, CacheProgress } from './util/opfs-cache.js';
export { buildGemmaPrompt } from './prompts/index.js';
export type { BuildGemmaPromptInput } from './prompts/index.js';
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
export { runAgentLoop, toProviderTools, fromMcpTools, trimConversationHistory } from './loop.js';
export { buildSystemPrompt, buildSystemPromptWithAliases } from './prompts/index.js';
export type { SystemPromptResult } from './prompts/index.js';
export type { AgentLoopOptions } from './loop.js';

// autoui — built-in WebMCP server
export { autoui, NATIVE_WIDGET_NAMES } from './autoui-server.js';

// Tool layers
export { buildToolsFromLayers, buildDiscoveryTools, buildDiscoveryToolsWithAliases, activateServerTools, resolveCanonicalTools, toolAliasMap, flattenPathMaps, buildDiscoveryCache } from './tool-layers.js';
export type { ToolLayer, McpLayer, WebMcpLayer, DiscoveryToolsResult, SchemaTransformOptions, BuildToolsResult, ProviderKind } from './tool-layers.js';

// Discovery cache
export { DiscoveryCache, DISCOVERY_TOOL_NAMES } from './discovery-cache.js';
export type { CachedRecipe, ServerCache } from './discovery-cache.js';

// Re-export core WebMCP types
export type { WebMcpServer, WebMcpToolDef, WidgetEntry } from '@webmcp-auto-ui/core';

// Recipes
export { WEBMCP_RECIPES, parseRecipe, parseRecipes } from './recipes/index.js';
export { recipeRegistry, registerRecipes, filterRecipesByServer, formatRecipesForPrompt, formatMcpRecipesForPrompt } from './recipe-registry.js';
export { filterRecipes, sortRecipes, recipeToMarkdown, recipeToDownloadBlob } from './recipe-browser.js';

// Tool browser
export { groupToolsByServer, formatToolSchema } from './tool-browser.js';
export type { BrowsableTool } from './tool-browser.js';

// Summarize
export { summarizeChat } from './summarize.js';
export type { SummarizeOptions, ChatSummaryResult } from './summarize.js';

// Token tracker
export { TokenTracker } from './token-tracker.js';
export type { TokenMetrics } from './token-tracker.js';

// Diagnostics
export { runDiagnostics } from './diagnostics.js';
export type { Diagnostic } from './diagnostics.js';

// Auto-repair
export { autoRepairParams } from './auto-repair.js';
export type { RepairResult } from './auto-repair.js';

// Pipeline trace
export { PipelineTrace, type TraceEntry } from './pipeline-trace.js';

// Trace observer — live visual trace for runAgentLoop
export { createTraceObserver, type TraceObserver, type TraceObserverContext, type RoundTripDetail } from './trace-observer.js';

// Nano-RAG — context compaction
export { ContextRAG, type ContextRAGOptions } from './nano-rag/mod.js';

// Types
export type {
  RemoteModelId, WasmModelId, TransformersModelId, LLMId, ModelId,
  ChatMessage, ContentBlock, McpToolDef, ProviderTool,
  LLMProvider, LLMResponse, ToolCall, AgentMetrics, AgentResult, AgentCallbacks,
  Recipe, McpRecipe,
} from './types.js';
