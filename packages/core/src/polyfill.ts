/**
 * @webmcp-auto-ui/core — WebMCP Polyfill
 *
 * Implements the 17 MUST HAVE features of the W3C WebMCP Draft CG Report
 * (2026-03-27) plus ecosystem extras.
 *
 * Architecture: shared module-level state (toolMap, polyfillOptions,
 * installState) mutated by installPolyfill/uninstallPolyfill. Installs a
 * single `navigator.modelContext` descriptor at init time; cleanup restores
 * the previous descriptor. Zero external dependencies.
 *
 * @license AGPL-3.0-or-later
 */

import type {
  ModelContextTool,
  ToolExecuteCallback,
  ToolRegistrationOptions,
  RegisteredTool,
  ToolExecuteResult,
  ModelContext,
  ModelContextTesting,
  ModelContextTestingToolInfo,
  ModelContextClient,
  ContextRegistration,
  ToolsChangedCallback,
  WebMCPPolyfillOptions,
  AuthContext,
  ConfirmationPolicy,
  UserInteractionOptions,
  UserInteractionResult,
  JsonSchema,
  JsonSchemaObject,
} from './types.js';
import { validateJsonSchema } from './validate.js';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Install state for save/restore of previous descriptors (Fix 7) */
interface InstallState {
  installed: boolean;
  /**
   * True only when we actually overrode navigator.modelContext. When native
   * WebMCP is present and forcePolyfill is false we short-circuit installation
   * and MUST NOT touch navigator on cleanup — otherwise we would delete the
   * native implementation.
   */
  didOverride: boolean;
  didOverrideTesting: boolean;
  previousModelContextDescriptor?: PropertyDescriptor;
  previousModelContextTestingDescriptor?: PropertyDescriptor;
}

// ---------------------------------------------------------------------------
// Module-level state (Feature 14 — ordered map)
// ---------------------------------------------------------------------------

/** Ordered tool map — Map preserves insertion order (W3C spec requirement) */
const toolMap = new Map<string, RegisteredTool>();

// Note: abortControllers array removed — we listen on user-provided signals,
// not our own controllers, so nothing was ever pushed here.

/** Single-slot toolsChanged callback (Fix 9 — last-writer-wins) */
let toolsChangedCallback: ToolsChangedCallback | null = null;

/** Polyfill configuration set at init time */
let polyfillOptions: WebMCPPolyfillOptions = {};

/** Install state — tracks whether we installed and the previous descriptors */
const installState: InstallState = { installed: false, didOverride: false, didOverrideTesting: false };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Notify the registered toolsChanged callback via queueMicrotask (Fix 9).
 * The callback takes NO arguments (MCP-B spec).
 */
function notifyToolsChanged(): void {
  if (!toolsChangedCallback) return;
  const cb = toolsChangedCallback;
  queueMicrotask(() => {
    try {
      cb();
    } catch (e) {
      console.error('[webmcp] toolsChanged callback error:', e);
    }
  });
}

/**
 * Broadcast a postMessage event for extension/bridge consumers.
 * SSR-safe: only runs if window is defined.
 */
function broadcastToolEvent(
  type: string,
  payload: Record<string, unknown>,
): void {
  if (typeof window !== 'undefined') {
    window.postMessage({ type, ...payload }, '*');
  }
}

// ---------------------------------------------------------------------------
// Fix 8 — normalizeToolResponse
// ---------------------------------------------------------------------------

/**
 * Normalize any tool callback return value into a ToolExecuteResult shape.
 * - If value already has content[] array, return as-is (possibly adding structuredContent)
 * - Otherwise auto-wrap primitives and objects
 */
function normalizeToolResponse(value: unknown): ToolExecuteResult {
  // If already a proper CallToolResult shape
  if (
    value &&
    typeof value === 'object' &&
    'content' in value &&
    Array.isArray((value as Record<string, unknown>).content)
  ) {
    const result = value as ToolExecuteResult;
    // Add structuredContent if not present and content has a text item
    if (!('structuredContent' in result)) {
      const firstText = result.content.find(c => c.type === 'text');
      if (firstText && firstText.type === 'text') {
        try {
          const parsed = JSON.parse(firstText.text);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return { ...result, structuredContent: parsed as Record<string, unknown> };
          }
        } catch {
          // not JSON — leave without structuredContent
        }
      }
    }
    return result;
  }

  // Auto-wrap primitives and objects
  const text =
    typeof value === 'string'
      ? value
      : (JSON.stringify(value) ?? String(value));

  const result: ToolExecuteResult = {
    content: [{ type: 'text', text }],
    isError: false,
  };

  // Add structuredContent for JSON-serializable objects
  if (value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
    try {
      const json = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
      result.structuredContent = json;
    } catch {
      // not serializable — skip structuredContent
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Fix 15 — Input schema helpers
// ---------------------------------------------------------------------------

/**
 * Detect Standard Schema v1 interface (~standard) and extract a plain
 * JSON Schema from it (Zod v4, Valibot, etc.).
 */
function extractJsonSchemaFromStandard(schema: unknown): JsonSchema | undefined {
  if (schema && typeof schema === 'object' && '~standard' in schema) {
    const std = (schema as Record<string, unknown>)['~standard'] as
      | Record<string, unknown>
      | undefined;
    // Try jsonSchema.input first (Zod v4, Valibot)
    if (
      std?.jsonSchema &&
      typeof std.jsonSchema === 'object' &&
      'input' in (std.jsonSchema as object)
    ) {
      return (std.jsonSchema as Record<string, unknown>).input as JsonSchema;
    }
    // Fallback: try to extract a plain schema
    if (std?.jsonSchema) return std.jsonSchema as JsonSchema;
  }
  return undefined;
}

/**
 * Normalize an input schema:
 * - undefined → undefined
 * - boolean → as-is
 * - {} → { type: 'object', properties: {} }
 * - object without type → { type: 'object', ...obj }
 */
function normalizeInputSchema(schema: JsonSchema | undefined): JsonSchema | undefined {
  if (schema === undefined) return undefined;
  if (typeof schema === 'boolean') return schema;
  const obj = schema as JsonSchemaObject;
  if (Object.keys(obj).length === 0) return { type: 'object', properties: {} };
  if (obj.type === undefined && !obj.anyOf && !obj.oneOf && !obj.allOf && !obj.$ref) {
    return { type: 'object', ...obj };
  }
  return schema;
}

// ---------------------------------------------------------------------------
// Feature 6 + 7 — ModelContextClient factory
// ---------------------------------------------------------------------------

/**
 * Create a ModelContextClient passed to each ToolExecuteCallback.
 * requestUserInteraction is a placeholder — W3C spec marks this as TODO.
 */
function createModelContextClient(): ModelContextClient {
  return {
    // Feature 7 — requestUserInteraction (spec placeholder)
    async requestUserInteraction(
      _options?: UserInteractionOptions,
    ): Promise<UserInteractionResult> {
      console.warn(
        '[webmcp] requestUserInteraction not implemented — defaulting to accepted. Pass a custom modelContextClient to override.',
      );
      return { accepted: true };
    },
  };
}

// ---------------------------------------------------------------------------
// Feature 8 — Input schema validation
// ---------------------------------------------------------------------------

/**
 * Validate tool input against its inputSchema.
 * Throws a TypeError with structured details if validation fails.
 */
function validateInput(
  tool: ModelContextTool,
  input: Record<string, unknown>,
): void {
  if (!tool.inputSchema) return;

  const result = validateJsonSchema(input, tool.inputSchema);
  if (!result.valid) {
    const summary = result.errors
      .map(e => `  ${e.path || '(root)'} [${e.keyword}]: ${e.message}`)
      .join('\n');
    throw new TypeError(
      `[webmcp] Input validation failed for tool "${tool.name}":\n${summary}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Extras — Auth context injection
// ---------------------------------------------------------------------------

/**
 * If an authContext is configured, inject it into the input object
 * under the `_authContext` key before calling execute.
 */
function injectAuthContext(
  input: Record<string, unknown>,
  authContext?: AuthContext,
): Record<string, unknown> {
  if (!authContext) return input;
  return { ...input, _authContext: authContext };
}

// ---------------------------------------------------------------------------
// Extras — Confirmation policy
// ---------------------------------------------------------------------------

/**
 * Determine whether a confirmation is required for a given tool
 * based on the polyfill's confirmation policy.
 */
async function checkConfirmationPolicy(
  tool: ModelContextTool,
  client: ModelContextClient,
  policy: ConfirmationPolicy,
): Promise<void> {
  const annotations = tool.annotations ?? {};
  const isDestructive = !!annotations.destructiveHint;
  const isReadOnly = !!annotations.readOnlyHint;
  const isMutating = !isReadOnly;

  let tier: string | undefined;

  if (isDestructive && policy.destructive && policy.destructive !== 'none') {
    tier = policy.destructive;
  } else if (isMutating && policy.mutating && policy.mutating !== 'none') {
    tier = policy.mutating;
  } else if (policy.all && policy.all !== 'none') {
    tier = policy.all;
  }

  if (!tier) return;

  if (tier === 'block') {
    throw new DOMException(
      `[webmcp] Tool "${tool.name}" is blocked by confirmation policy`,
      'NotAllowedError',
    );
  }

  if (tier === 'warn') {
    const hint = isDestructive
      ? 'This tool may make irreversible changes.'
      : 'This tool will modify state.';
    const result = await client.requestUserInteraction({
      prompt: `${hint} Proceed with "${tool.name}"?`,
      kind: 'confirmation',
    });
    if (!result.accepted) {
      throw new DOMException(
        `[webmcp] Tool "${tool.name}" execution cancelled by user`,
        'AbortError',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Core execution — used by both registerTool and modelContextTesting
// ---------------------------------------------------------------------------

/**
 * Execute a registered tool by name.
 * Steps:
 *   1. Look up tool in map
 *   2. Validate input against inputSchema (Feature 8)
 *   3. Inject authContext if configured (Extra)
 *   4. Apply confirmation policy if applicable (Extra)
 *   5. Create a ModelContextClient (Feature 6)
 *   6. Call execute(input, client)
 *   7. Normalize and return the result (Fix 8)
 */
export async function executeToolInternal(
  name: string,
  input: Record<string, unknown>,
): Promise<ToolExecuteResult> {
  const registered = toolMap.get(name);
  if (!registered) {
    throw new Error(`[webmcp] Tool "${name}" not found`);
  }

  const { tool, execute } = registered;

  // Feature 8 — validate input
  validateInput(tool, input);

  // Extra — inject auth context
  const enrichedInput = injectAuthContext(input, polyfillOptions.authContext);

  // Create client before confirmation check (client is passed to requestUserInteraction)
  const client = createModelContextClient();

  // Extra — confirmation policy
  if (polyfillOptions.confirmationPolicy) {
    await checkConfirmationPolicy(tool, client, polyfillOptions.confirmationPolicy);
  }

  // Feature 6 — call execute with enriched input and client
  const raw = await execute(enrichedInput, client);

  // Fix 8 — normalize result
  return normalizeToolResponse(raw);
}

// ---------------------------------------------------------------------------
// Feature 2 — registerTool
// ---------------------------------------------------------------------------

function registerTool(
  tool: ModelContextTool & { execute: ToolExecuteCallback },
  options?: ToolRegistrationOptions,
): void {
  // Extra — zero-cost degradation: no-op in non-browser environments
  if (polyfillOptions.degradeGracefully && typeof window === 'undefined') {
    return;
  }

  // Feature 11 — validate name and description (Fix 3)
  if (!tool.name || !tool.name.trim()) {
    throw new TypeError('Tool "name" must be a non-empty string');
  }
  if (!tool.description || !tool.description.trim()) {
    throw new TypeError('Tool "description" must be a non-empty string');
  }

  // Feature 10 — reject duplicate names (Fix 3)
  if (toolMap.has(tool.name)) {
    throw new Error(`Tool already registered: ${tool.name}`);
  }

  // Fix 5 — Already-aborted signal: skip registration entirely
  if (options?.signal?.aborted) {
    console.warn(`[webmcp] Tool "${tool.name}" not registered: signal already aborted`);
    return;
  }

  const { execute, ...toolDef } = tool;

  // Fix 17 — Standard Schema v1 support: extract JSON Schema from ~standard
  const extractedSchema = extractJsonSchemaFromStandard(toolDef.inputSchema as unknown);
  if (extractedSchema !== undefined) {
    toolDef.inputSchema = extractedSchema;
  }

  // Fix 15 — Normalize input schema (inject type if missing, handle {})
  const normalizedSchema = normalizeInputSchema(toolDef.inputSchema);
  if (normalizedSchema !== toolDef.inputSchema) {
    toolDef.inputSchema = normalizedSchema;
  }

  // Fix 4 — Stringify input schema at registration time
  let serializedInputSchema: string | undefined;
  if (toolDef.inputSchema !== undefined) {
    try {
      const str = JSON.stringify(toolDef.inputSchema);
      if (str === undefined) {
        throw new TypeError('Tool inputSchema cannot be serialized to JSON');
      }
      serializedInputSchema = str;
    } catch (e) {
      throw e; // re-throw (circular ref, etc.)
    }
  }

  const registered: RegisteredTool = {
    tool: toolDef,
    execute,
    serializedInputSchema,
    registeredAt: Date.now(),
  };

  toolMap.set(tool.name, registered);

  // Feature 3 — AbortSignal auto-unregistration
  if (options?.signal) {
    const signal = options.signal;
    // Note: already checked aborted above, so signal is live here

    const handleAbort = (): void => {
      if (toolMap.has(tool.name)) {
        toolMap.delete(tool.name);
        notifyToolsChanged();
        broadcastToolEvent('webmcp:tool-unregistered', { name: tool.name });
      }
    };

    signal.addEventListener('abort', handleAbort, { once: true });
  }

  // Feature 17 — notify callbacks
  notifyToolsChanged();

  // Broadcast for extension/bridge consumers
  broadcastToolEvent('webmcp:tool-registered', {
    name: tool.name,
    description: tool.description,
  });
}

// ---------------------------------------------------------------------------
// Feature 4 — unregisterTool (explicit, by name or { name }) (Fix 10)
// ---------------------------------------------------------------------------

function unregisterTool(nameOrTool: string | { name: string }): void {
  // Extra — zero-cost degradation
  if (polyfillOptions.degradeGracefully && typeof window === 'undefined') {
    return;
  }

  const name =
    typeof nameOrTool === 'string' ? nameOrTool : nameOrTool?.name;

  if (typeof name !== 'string') {
    throw new TypeError(
      'unregisterTool: argument must be a string or an object with a "name" property',
    );
  }

  if (!toolMap.has(name)) return;

  toolMap.delete(name);
  notifyToolsChanged();
  broadcastToolEvent('webmcp:tool-unregistered', { name });
}

// ---------------------------------------------------------------------------
// Feature 5 — provideContext (batch registration)
// ---------------------------------------------------------------------------

function provideContext(registrations: ContextRegistration[]): void {
  // Extra — zero-cost degradation
  if (polyfillOptions.degradeGracefully && typeof window === 'undefined') {
    return;
  }

  // Clear the tool map (new context replaces old one)
  toolMap.clear();

  // Register each tool from the new context
  for (const registration of registrations) {
    const { tool, options } = registration;

    // Inline validation — Fix 3 error types
    if (!tool.name || !tool.name.trim()) {
      throw new TypeError('Tool "name" must be a non-empty string');
    }
    if (!tool.description || !tool.description.trim()) {
      throw new TypeError('Tool "description" must be a non-empty string');
    }
    if (toolMap.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    // Fix 5 — skip already-aborted signal
    if (options?.signal?.aborted) {
      console.warn(`[webmcp] Tool "${tool.name}" not registered: signal already aborted`);
      continue;
    }

    const { execute, ...toolDef } = tool;

    // Fix 17 — Standard Schema v1 support
    const extractedSchema = extractJsonSchemaFromStandard(toolDef.inputSchema as unknown);
    if (extractedSchema !== undefined) {
      toolDef.inputSchema = extractedSchema;
    }

    // Fix 15 — Normalize input schema
    const normalizedSchema = normalizeInputSchema(toolDef.inputSchema);
    if (normalizedSchema !== toolDef.inputSchema) {
      toolDef.inputSchema = normalizedSchema;
    }

    // Fix 4 — Serialize input schema
    let serializedInputSchema: string | undefined;
    if (toolDef.inputSchema !== undefined) {
      serializedInputSchema = JSON.stringify(toolDef.inputSchema);
    }

    toolMap.set(tool.name, {
      tool: toolDef,
      execute,
      serializedInputSchema,
      registeredAt: Date.now(),
    });

    // Feature 3 — wire up AbortSignal if provided
    if (options?.signal) {
      const signal = options.signal;
      const toolName = tool.name;
      const handleAbort = (): void => {
        if (toolMap.has(toolName)) {
          toolMap.delete(toolName);
          notifyToolsChanged();
          broadcastToolEvent('webmcp:tool-unregistered', { name: toolName });
        }
      };
      signal.addEventListener('abort', handleAbort, { once: true });
    }
  }

  // Feature 17 — single notification for the entire batch
  notifyToolsChanged();
}

// ---------------------------------------------------------------------------
// Extra — clearContext (SPA navigation cleanup)
// ---------------------------------------------------------------------------

function clearContext(): void {
  // Extra — zero-cost degradation
  if (polyfillOptions.degradeGracefully && typeof window === 'undefined') {
    return;
  }

  toolMap.clear();
  notifyToolsChanged();
}

// ---------------------------------------------------------------------------
// Feature 17 — registerToolsChangedCallback (Fix 9 — single slot)
// ---------------------------------------------------------------------------

function registerToolsChangedCallback(callback: ToolsChangedCallback): void {
  toolsChangedCallback = callback; // last-writer-wins
}

// ---------------------------------------------------------------------------
// Feature 16 — navigator.modelContextTesting shim (Fixes 1, 2, 13)
// ---------------------------------------------------------------------------

const modelContextTesting: ModelContextTesting = {
  /** Fix 2 — return ModelContextTestingToolInfo[] with serialized inputSchema */
  listTools(): ModelContextTestingToolInfo[] {
    return Array.from(toolMap.values()).map(r => ({
      name: r.tool.name,
      description: r.tool.description,
      inputSchema: r.serializedInputSchema, // JSON string, not object
    }));
  },

  /**
   * Fix 1 — Takes JSON string input, returns JSON string or null.
   * Races against options.signal if provided.
   */
  async executeTool(
    toolName: string,
    inputArgsJson: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    let input: Record<string, unknown>;
    try {
      const parsed = JSON.parse(inputArgsJson);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new TypeError('inputArgsJson must be a JSON object');
      }
      input = parsed as Record<string, unknown>;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new DOMException(msg, 'UnknownError');
    }

    // Build execution promise
    const execPromise = executeToolInternal(toolName, input).then(result => {
      // If result _meta indicates willNavigate, return null
      if (result._meta?.willNavigate === true) {
        return null;
      }
      return JSON.stringify(result);
    });

    // Race against AbortSignal if provided
    if (options?.signal) {
      const signal = options.signal;

      if (signal.aborted) {
        throw new DOMException('Tool was cancelled', 'UnknownError');
      }

      const abortPromise = new Promise<never>((_, reject) => {
        signal.addEventListener(
          'abort',
          () => reject(new DOMException('Tool was cancelled', 'UnknownError')),
          { once: true },
        );
      });

      try {
        return await Promise.race([execPromise, abortPromise]);
      } catch (e) {
        if (e instanceof DOMException) throw e;
        const msg = e instanceof Error ? e.message : String(e);
        throw new DOMException(msg, 'UnknownError');
      }
    }

    try {
      return await execPromise;
    } catch (e) {
      if (e instanceof DOMException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new DOMException(msg, 'UnknownError');
    }
  },

  /** Fix 13 — polyfill stub; native Chrome may implement differently */
  async getCrossDocumentScriptToolResult(): Promise<string> {
    return '[]';
  },
};

// ---------------------------------------------------------------------------
// The full modelContext object installed on navigator
// ---------------------------------------------------------------------------

const modelContext: ModelContext = {
  registerTool,
  unregisterTool,
  provideContext,
  clearContext,
  registerToolsChangedCallback,
};

// Fix 6 — Mark the object as a polyfill (non-enumerable, non-writable)
Object.defineProperty(modelContext, '__isWebMCPPolyfill', {
  value: true,
  writable: false,
  enumerable: false,
  configurable: false,
});

// ---------------------------------------------------------------------------
// Feature 13 — Native detection
// ---------------------------------------------------------------------------

/**
 * Returns true when the browser exposes a native WebMCP implementation
 * (Chrome 146+ or a compatible browser) — no polyfill needed in that case.
 */
export function hasNativeWebMCP(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof (
      navigator as Navigator & { modelContext?: { registerTool?: unknown } }
    ).modelContext?.registerTool === 'function' &&
    !(
      (navigator as Navigator & { modelContext?: { __isWebMCPPolyfill?: boolean } })
        .modelContext?.__isWebMCPPolyfill === true
    )
  );
}

// ---------------------------------------------------------------------------
// Feature 15 — initializeWebMCPPolyfill
// ---------------------------------------------------------------------------

/**
 * Install the WebMCP polyfill on `navigator.modelContext`.
 *
 * Behavior:
 *  - If native WebMCP is present and `forcePolyfill` is not set, skip install
 *  - If already installed by us, call cleanupWebMCPPolyfill first then re-install
 *  - Saves previous property descriptors for restore on cleanup (Fix 7)
 *  - Installs testing shim per installTestingShim option (Fix 14)
 *
 * Throws a SecurityError if called from a non-secure context (HTTP)
 * unless `options.allowInsecureContext` is true.
 */
export function initializeWebMCPPolyfill(
  options?: WebMCPPolyfillOptions,
): void {
  // Extra — zero-cost degradation: SSR/Node environment
  if (options?.degradeGracefully && typeof window === 'undefined') {
    return;
  }

  polyfillOptions = options ?? {};

  // Feature 12 — SecureContext check (Fix 3 — keep DOMException SecurityError)
  if (
    typeof window !== 'undefined' &&
    !window.isSecureContext &&
    !polyfillOptions.allowInsecureContext
  ) {
    throw new DOMException(
      'WebMCP requires a secure context (HTTPS)',
      'SecurityError',
    );
  }

  // Feature 13 — Skip polyfill when native WebMCP is available
  // forcePolyfill is checked BEFORE the native skip so it takes precedence
  if (hasNativeWebMCP() && !polyfillOptions.forcePolyfill) {
    installState.installed = true;
    installState.didOverride = false;
    installState.didOverrideTesting = false;
    return;
  }

  // If our polyfill is already installed, cleanup first then re-install
  if (installState.installed) {
    cleanupWebMCPPolyfill();
    // Re-apply options after cleanup resets them
    polyfillOptions = options ?? {};
  }

  // Feature 1 — Install polyfill on navigator
  if (typeof navigator !== 'undefined') {
    // Fix 7 — Save previous descriptors for restore on cleanup
    installState.previousModelContextDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      'modelContext',
    );
    installState.previousModelContextTestingDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      'modelContextTesting',
    );

    Object.defineProperty(navigator, 'modelContext', {
      value: modelContext,
      configurable: true,
      writable: false,
      enumerable: true,
    });
    installState.didOverride = true;

    // Fix 14 — installTestingShim option
    const shimOption = polyfillOptions.installTestingShim ?? 'if-missing';
    if (
      shimOption === 'always' ||
      (shimOption === 'if-missing' && !navigator.modelContextTesting)
    ) {
      Object.defineProperty(navigator, 'modelContextTesting', {
        value: modelContextTesting,
        configurable: true,
        writable: false,
        enumerable: true,
      });
      installState.didOverrideTesting = true;
    }
  }

  installState.installed = true;
}

// ---------------------------------------------------------------------------
// Feature 15 — cleanupWebMCPPolyfill (HMR / hot-reload compat)
// ---------------------------------------------------------------------------

/**
 * Remove the WebMCP polyfill from navigator and reset all module state.
 *
 * Restores previous property descriptors if they existed (Fix 7).
 * Call this in your framework's cleanup / onDestroy hook to support
 * Vite/Svelte HMR without tool duplication on reload.
 */
export function cleanupWebMCPPolyfill(): void {
  // Clear tool map
  toolMap.clear();

  // Clear callback slot
  toolsChangedCallback = null;

  // Fix 7 — Restore previous descriptors instead of deleting.
  // Guard with didOverride/didOverrideTesting: when native WebMCP was present
  // and we short-circuited install, we never defined properties on navigator
  // and must NOT delete or overwrite them here (that would remove the native).
  if (typeof navigator !== 'undefined') {
    try {
      if (installState.didOverride) {
        if (installState.previousModelContextDescriptor) {
          Object.defineProperty(
            navigator,
            'modelContext',
            installState.previousModelContextDescriptor,
          );
        } else {
          delete (navigator as Navigator & Record<string, unknown>).modelContext;
        }
      }

      if (installState.didOverrideTesting) {
        if (installState.previousModelContextTestingDescriptor) {
          Object.defineProperty(
            navigator,
            'modelContextTesting',
            installState.previousModelContextTestingDescriptor,
          );
        } else {
          const testingDesc = Object.getOwnPropertyDescriptor(
            navigator,
            'modelContextTesting',
          );
          if (testingDesc?.configurable) {
            delete (navigator as Navigator & Record<string, unknown>).modelContextTesting;
          }
        }
      }
    } catch (e) {
      console.warn('[webmcp] Could not restore navigator descriptors:', e);
    }
  }

  // Reset options and install state
  polyfillOptions = {};
  installState.installed = false;
  installState.didOverride = false;
  installState.didOverrideTesting = false;
  installState.previousModelContextDescriptor = undefined;
  installState.previousModelContextTestingDescriptor = undefined;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { initializeWebMCPPolyfill as default };
// Note: executeToolInternal is also exported above (for events.ts bridge)

// ---------------------------------------------------------------------------
// Fix 20 — IIFE auto-init
// ---------------------------------------------------------------------------

// Auto-initialize if running in a browser with window.__webMCPPolyfillOptions
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const opts = (window as Window & { __webMCPPolyfillOptions?: WebMCPPolyfillOptions })
    .__webMCPPolyfillOptions;
  if (opts?.autoInitialize !== false) {
    try {
      initializeWebMCPPolyfill(opts);
    } catch (e) {
      console.warn('[webmcp] Auto-initialization failed:', e);
    }
  }
}
