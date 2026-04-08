// @webmcp-auto-ui/core — public API
// W3C WebMCP polyfill + MCP Streamable HTTP client + utilities

// Types
export type {
  JsonSchemaType,
  JsonSchemaObject,
  JsonSchema,
  ToolAnnotations,
  ModelContextTool,
  ToolExecuteCallback,
  ModelContextClient,
  UserInteractionOptions,
  UserInteractionResult,
  ToolRegistrationOptions,
  RegisteredTool,
  ContextRegistration,
  ToolsChangedCallback,
  ModelContext,
  ModelContextTesting,
  ModelContextTestingToolInfo,
  ToolContentType,
  ToolContentText,
  ToolContentImage,
  ToolContentResource,
  ToolContentError,
  ToolContent,
  ToolExecuteResult,
  ToolResultMetadata,
  AuthContext,
  ConfirmationTier,
  ConfirmationPolicy,
  WebMCPPolyfillOptions,
  JsonRpcRequest,
  JsonRpcError,
  JsonRpcResponse,
  McpServerInfo,
  McpCapabilities,
  McpInitializeResult,
  McpTool,
  McpToolResultContent,
  McpToolResult,
  McpListToolsResult,
  McpClientOptions,
  WebMCPCallToolEvent,
  WebMCPToolResultEvent,
  WebMCPToolErrorEvent,
  PostMessageBridgeOptions,
} from './types.js';

// Validation
export { validateJsonSchema } from './validate.js';
export type { ValidationResult, ValidationError } from './validate.js';

// Polyfill
export {
  initializeWebMCPPolyfill,
  cleanupWebMCPPolyfill,
  hasNativeWebMCP,
  executeToolInternal,
} from './polyfill.js';

// MCP Client
export { McpClient } from './client.js';

// postMessage bridge
export {
  listenForAgentCalls,
  stopListening,
  callToolViaPostMessage,
  isWebMCPEvent,
} from './events.js';

// Utilities
export {
  dispatchAndWait,
  signalCompletion,
  sanitizeSchema,
  createToolGroup,
} from './utils.js';

// WebMCP helpers (skill registry + result builders)
export {
  textResult,
  jsonResult,
  registerSkill,
  unregisterSkill,
  getSkill,
  listSkills,
  clearSkills,
} from './webmcp-helpers.js';
export type { SkillDef } from './webmcp-helpers.js';

// Multi-MCP client
export { McpMultiClient } from './multi-client.js';
export type { ConnectedServer } from './multi-client.js';
