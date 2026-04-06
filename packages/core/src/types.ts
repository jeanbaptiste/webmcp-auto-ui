// ---------------------------------------------------------------------------
// @webmcp-auto-ui/core — Type definitions
// W3C WebMCP Draft CG Report (2026-03-27) + MCP extras
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// JSON Schema (subset used by inputSchema)
// ---------------------------------------------------------------------------

export type JsonSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

export interface JsonSchemaObject {
  type?: JsonSchemaType | JsonSchemaType[];
  title?: string;
  description?: string;
  default?: unknown;
  examples?: unknown[];

  // string
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  enum?: unknown[];
  const?: unknown;

  // number / integer
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  multipleOf?: number;

  // object
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  patternProperties?: Record<string, JsonSchema>;

  // array
  items?: JsonSchema | JsonSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // composition
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  not?: JsonSchema;

  // misc
  $ref?: string;
  $schema?: string;
  $id?: string;
  $defs?: Record<string, JsonSchema>;
  definitions?: Record<string, JsonSchema>;
  if?: JsonSchema;
  then?: JsonSchema;
  else?: JsonSchema;
  nullable?: boolean;
}

export type JsonSchema = boolean | JsonSchemaObject;

// ---------------------------------------------------------------------------
// Tool Annotations (W3C spec + MCP SDK superset)
// ---------------------------------------------------------------------------

export interface ToolAnnotations {
  /** Hint: tool does not modify any state */
  readOnlyHint?: boolean;
  /** Hint: tool may modify state in a destructive/irreversible way */
  destructiveHint?: boolean;
  /** Hint: calling the tool multiple times with the same args has same effect */
  idempotentHint?: boolean;
  /** Hint: tool may interact with external systems (network, disk, etc.) */
  openWorldHint?: boolean;
  /** Hint: tool should be used with caution */
  cautionHint?: boolean;
  /** Human-readable title (MCP SDK) */
  title?: string;
}

// ---------------------------------------------------------------------------
// ModelContextTool — the W3C spec shape
// ---------------------------------------------------------------------------

export interface ModelContextTool {
  /** Unique name, must not be empty */
  name: string;
  /** Human-readable description, must not be empty */
  description: string;
  /** JSON Schema describing the tool's input parameters */
  inputSchema?: JsonSchema;
  /** JSON Schema describing the tool's structured output */
  outputSchema?: JsonSchema;
  /** Annotations about tool behavior */
  annotations?: ToolAnnotations;
}

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

/** Content types returned by a tool */
export type ToolContentType = 'text' | 'image' | 'resource' | 'error';

export interface ToolContentText {
  type: 'text';
  text: string;
}

export interface ToolContentImage {
  type: 'image';
  data: string; // base64
  mimeType: string;
}

export interface ToolContentResource {
  type: 'resource';
  resource: {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
}

export interface ToolContentError {
  type: 'error';
  error: string;
}

export type ToolContent =
  | ToolContentText
  | ToolContentImage
  | ToolContentResource
  | ToolContentError;

/** Extensible metadata for tool results */
export interface ToolResultMetadata {
  willNavigate?: boolean;
  [key: string]: unknown;
}

export interface ToolExecuteResult {
  content: ToolContent[];
  isError?: boolean;
  /** JSON-serializable structured data (MCP structured output) */
  structuredContent?: Record<string, unknown>;
  /** Extensible metadata */
  _meta?: ToolResultMetadata;
}

// ---------------------------------------------------------------------------
// ModelContextClient — passed to each ToolExecuteCallback
// ---------------------------------------------------------------------------

export interface UserInteractionOptions {
  /** Human-readable prompt to show the user */
  prompt?: string;
  /** Interaction type hint */
  kind?: 'confirmation' | 'input' | 'choice';
  /** For 'choice' kind */
  choices?: string[];
}

export interface UserInteractionResult {
  accepted: boolean;
  value?: string;
}

export interface ModelContextClient {
  /**
   * Request user interaction before the tool proceeds.
   * W3C spec marks this as TODO — placeholder implementation.
   */
  requestUserInteraction(
    options?: UserInteractionOptions
  ): Promise<UserInteractionResult>;
}

// ---------------------------------------------------------------------------
// ToolExecuteCallback
// ---------------------------------------------------------------------------

export type ToolExecuteCallback = (
  input: Record<string, unknown>,
  client: ModelContextClient
) => Promise<ToolExecuteResult> | ToolExecuteResult;

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export interface ToolRegistrationOptions {
  /** AbortSignal to auto-unregister the tool when aborted */
  signal?: AbortSignal;
}

export interface RegisteredTool {
  tool: ModelContextTool;
  execute: ToolExecuteCallback;
  /** JSON.stringify'd input schema for fast serialization */
  serializedInputSchema?: string;
  registeredAt: number;
}

// ---------------------------------------------------------------------------
// Context registration (provideContext batch)
// ---------------------------------------------------------------------------

export interface ContextRegistration {
  tool: ModelContextTool & { execute: ToolExecuteCallback };
  options?: ToolRegistrationOptions;
}

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

/** Called with no arguments when the tool set changes (MCP-B spec). */
export type ToolsChangedCallback = () => void;

// ---------------------------------------------------------------------------
// ModelContext — the navigator.modelContext interface
// ---------------------------------------------------------------------------

export interface ModelContext {
  registerTool(
    tool: ModelContextTool & { execute: ToolExecuteCallback },
    options?: ToolRegistrationOptions
  ): void;
  unregisterTool(nameOrTool: string | { name: string }): void;
  provideContext(registrations: ContextRegistration[]): void;
  clearContext(): void;
  registerToolsChangedCallback(callback: ToolsChangedCallback): void;
}

// ---------------------------------------------------------------------------
// ModelContextTesting — navigator.modelContextTesting shim
// ---------------------------------------------------------------------------

/** Info shape returned by modelContextTesting.listTools() */
export interface ModelContextTestingToolInfo {
  name: string;
  description: string;
  /** Serialized JSON Schema string */
  inputSchema?: string;
}

export interface ModelContextTesting {
  listTools(): ModelContextTestingToolInfo[];
  executeTool(
    toolName: string,
    inputArgsJson: string,
    options?: { signal?: AbortSignal }
  ): Promise<string | null>;
  getCrossDocumentScriptToolResult(): Promise<string>;
}

// ---------------------------------------------------------------------------
// Auth context (Plotono architecture)
// ---------------------------------------------------------------------------

export interface AuthContext {
  userId?: string;
  tenantId?: string;
  workspaceId?: string;
  roles?: string[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Confirmation policy (Plotono 3-tier gates)
// ---------------------------------------------------------------------------

export type ConfirmationTier = 'none' | 'warn' | 'block';

export interface ConfirmationPolicy {
  /** Require confirmation for destructive tools */
  destructive?: ConfirmationTier;
  /** Require confirmation for tools without readOnlyHint */
  mutating?: ConfirmationTier;
  /** Require confirmation for all tools */
  all?: ConfirmationTier;
}

// ---------------------------------------------------------------------------
// Polyfill initialization options
// ---------------------------------------------------------------------------

export interface WebMCPPolyfillOptions {
  /**
   * Force installing the polyfill even when native WebMCP is detected.
   * Useful for testing.
   */
  forcePolyfill?: boolean;

  /**
   * Allow running in non-secure contexts (HTTP).
   * Should only be set to true during development.
   */
  allowInsecureContext?: boolean;

  /**
   * If true and the environment has no window (SSR/Node),
   * all polyfill functions become silent no-ops.
   */
  degradeGracefully?: boolean;

  /**
   * Auth context injected into every tool's input as `_authContext`.
   */
  authContext?: AuthContext;

  /**
   * Confirmation policy applied before executing tools.
   */
  confirmationPolicy?: ConfirmationPolicy;

  /**
   * Controls when the testing shim (navigator.modelContextTesting) is installed.
   * - 'if-missing' (default): install only if navigator.modelContextTesting is not already set
   * - 'always': always install (overwrite native)
   * - false: never install
   */
  installTestingShim?: 'if-missing' | 'always' | false;

  /**
   * If false, skip IIFE auto-initialization even when window.__webMCPPolyfillOptions is set.
   * Default: true
   */
  autoInitialize?: boolean;
}

// ---------------------------------------------------------------------------
// MCP Client — JSON-RPC + Streamable HTTP types
// ---------------------------------------------------------------------------

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: T;
  error?: JsonRpcError;
}

export interface McpServerInfo {
  name: string;
  version: string;
}

export interface McpCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { listChanged?: boolean; subscribe?: boolean };
  prompts?: { listChanged?: boolean };
  logging?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface McpInitializeResult {
  protocolVersion: string;
  capabilities: McpCapabilities;
  serverInfo: McpServerInfo;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
  annotations?: ToolAnnotations;
}

export interface McpToolResultContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: { uri: string; mimeType?: string; text?: string; blob?: string };
}

export interface McpToolResult {
  content: McpToolResultContent[];
  isError?: boolean;
}

export interface McpListToolsResult {
  tools: McpTool[];
  nextCursor?: string;
}

export interface McpClientOptions {
  /** Client name sent during initialize */
  clientName?: string;
  /** Client version sent during initialize */
  clientVersion?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Extra headers attached to every request */
  headers?: Record<string, string>;
  /** Auto-reconnect on 404 session-expired */
  autoReconnect?: boolean;
  /** Max reconnect attempts (default: 3) */
  maxReconnectAttempts?: number;
}

// ---------------------------------------------------------------------------
// postMessage bridge — WebMCP event types
// ---------------------------------------------------------------------------

export interface PostMessageBridgeOptions {
  /** Target origin for postMessage calls (default: '*') */
  targetOrigin?: string;
  /** Origins to accept messages from; empty array = accept all */
  allowedOrigins?: string[];
}

export interface WebMCPCallToolEvent {
  type: 'webmcp:call-tool';
  callId: string;
  name: string;
  args?: Record<string, unknown>;
}

export interface WebMCPToolResultEvent {
  type: 'webmcp:tool-result';
  callId: string;
  result: ToolExecuteResult;
}

export interface WebMCPToolErrorEvent {
  type: 'webmcp:tool-error';
  callId: string;
  error: string;
}

// ---------------------------------------------------------------------------
// Navigator augmentation
// ---------------------------------------------------------------------------

declare global {
  interface Navigator {
    modelContext?: ModelContext;
    modelContextTesting?: ModelContextTesting;
  }
}
