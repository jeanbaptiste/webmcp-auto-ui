// ---------------------------------------------------------------------------
// @webmcp-auto-ui/core — UI sync helpers + schema utilities
// Zero dependencies. SSR-safe.
// ---------------------------------------------------------------------------

import type { JsonSchema, JsonSchemaObject } from './types.js';

// ---------------------------------------------------------------------------
// Item 18 — dispatchAndWait (UI sync helper)
// ---------------------------------------------------------------------------

/**
 * Dispatch a CustomEvent and wait for a completion event.
 * Solves the "execute must return after UI updates" requirement.
 *
 * Pattern: dispatch "tool-action" → UI handles it → UI dispatches "tool-completion-{requestId}"
 *
 * @param eventName - Name of the event to dispatch
 * @param detail - Event detail payload
 * @param options - Timeout and target
 * @returns Promise that resolves when the completion event fires
 */
export function dispatchAndWait<T = unknown>(
  eventName: string,
  detail?: Record<string, unknown>,
  options?: { timeout?: number; successValue?: T; target?: EventTarget }
): Promise<T> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('dispatchAndWait: window is not available (SSR?)'));
  }

  const timeout = options?.timeout ?? 5000;
  const target = options?.target ?? window;
  const requestId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const completionEventName = `tool-completion-${requestId}`;

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      target.removeEventListener(completionEventName, handleCompletion);
      reject(new Error(`dispatchAndWait: "${eventName}" timed out after ${timeout}ms`));
    }, timeout);

    function handleCompletion(event: Event) {
      clearTimeout(timer);
      target.removeEventListener(completionEventName, handleCompletion);
      const customEvent = event as CustomEvent;
      resolve(customEvent.detail ?? options?.successValue ?? (undefined as T));
    }

    target.addEventListener(completionEventName, handleCompletion);

    // Dispatch the action event with the requestId so the handler knows where to send completion
    target.dispatchEvent(
      new CustomEvent(eventName, {
        detail: { ...detail, requestId, completionEventName },
      })
    );
  });
}

/**
 * Helper to signal completion of a dispatchAndWait request.
 * Call this from your UI handler after the update is done.
 */
export function signalCompletion(completionEventName: string, detail?: unknown): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(completionEventName, { detail }));
}

// ---------------------------------------------------------------------------
// Item 19 — sanitizeSchema (for AI SDKs)
// ---------------------------------------------------------------------------

/**
 * Strip JSON Schema keywords that cause errors in AI SDKs
 * (e.g., Vercel AI SDK rejects oneOf/anyOf on non-STRING types).
 *
 * Use this before passing tool schemas to LLM providers.
 */
export function sanitizeSchema(schema: JsonSchema): JsonSchema {
  if (typeof schema === 'boolean') return schema;
  return sanitizeSchemaObject({ ...schema } as JsonSchemaObject, new WeakSet());
}

function sanitizeSchemaObject(obj: JsonSchemaObject, seen: WeakSet<object>): JsonSchemaObject {
  if (seen.has(obj)) return obj; // circular ref — return as-is
  seen.add(obj);

  const result = { ...obj };

  // Remove composition keywords that AI SDKs can't handle
  delete result.oneOf;
  delete result.anyOf;
  delete result.allOf;
  delete result.not;

  // Remove conditional keywords
  delete result.if;
  delete result.then;
  delete result.else;

  // Remove $ref (needs dereferencing first)
  delete result.$ref;

  // Recursively sanitize nested schemas
  if (result.properties) {
    const sanitizedProps: Record<string, JsonSchema> = {};
    for (const [key, value] of Object.entries(result.properties)) {
      sanitizedProps[key] = typeof value === 'boolean'
        ? value
        : sanitizeSchemaObject({ ...value } as JsonSchemaObject, seen);
    }
    result.properties = sanitizedProps;
  }

  if (result.items) {
    if (Array.isArray(result.items)) {
      result.items = result.items.map((item) =>
        typeof item === 'boolean'
          ? item
          : sanitizeSchemaObject({ ...item } as JsonSchemaObject, seen)
      );
    } else if (typeof result.items !== 'boolean') {
      result.items = sanitizeSchemaObject({ ...result.items } as JsonSchemaObject, seen);
    }
  }

  if (result.additionalProperties && typeof result.additionalProperties === 'object') {
    result.additionalProperties = sanitizeSchemaObject(
      { ...result.additionalProperties } as JsonSchemaObject,
      seen
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// createToolGroup — ergonomic helper for SPA route-based tool registration
// ---------------------------------------------------------------------------

/**
 * Create a named tool group backed by a shared AbortController.
 * Ergonomic helper for SPA route-based tool registration.
 *
 * Usage:
 *   const group = createToolGroup('search-page');
 *   group.register(tool1, registerFn);
 *   group.register(tool2, registerFn);
 *   // On route change:
 *   group.abort(); // unregisters all tools in the group
 */
export function createToolGroup(name: string): {
  name: string;
  register: (
    tool: {
      name: string;
      description: string;
      inputSchema?: JsonSchema;
      execute: (...args: any[]) => any;
      annotations?: Record<string, unknown>;
    },
    registerFn: (tool: any, options: { signal: AbortSignal }) => void
  ) => void;
  abort: () => void;
  isAborted: () => boolean;
} {
  let controller = new AbortController();

  return {
    name,
    register(tool, registerFn) {
      if (controller.signal.aborted) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[createToolGroup] "${name}": register() called after abort(). The group has been reset. Consider creating a new group instead.`);
        }
        controller = new AbortController();
      }
      registerFn(tool, { signal: controller.signal });
    },
    abort() {
      controller.abort();
    },
    isAborted() {
      return controller.signal.aborted;
    },
  };
}

