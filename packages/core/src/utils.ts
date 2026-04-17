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

export interface SchemaPatch {
  path: string;          // e.g. "root", "properties.params", "properties.data.items"
  type: 'additionalProperties' | 'removed'; // what was patched
  keyword?: string;      // which keyword was removed (for type: 'removed')
  detail?: string;       // human-readable detail
  value?: false;         // for additionalProperties patches
}

/**
 * Sanitize schema AND report patches applied for strict tool use.
 * Use this when you need visibility into what was changed.
 */
export function sanitizeSchemaWithReport(schema: JsonSchema): { schema: JsonSchema; patches: SchemaPatch[] } {
  if (typeof schema === 'boolean') return { schema, patches: [] };
  const patches: SchemaPatch[] = [];
  const result = sanitizeSchemaObjectWithReport({ ...schema } as JsonSchemaObject, new WeakSet(), 'root', patches);
  return { schema: result, patches };
}

function sanitizeSchemaObjectWithReport(obj: JsonSchemaObject, seen: WeakSet<object>, path: string, patches: SchemaPatch[]): JsonSchemaObject {
  if (seen.has(obj)) return obj;
  seen.add(obj);

  const result = { ...obj };

  // Remove composition keywords unsupported by Anthropic structured outputs.
  // anyOf and allOf are supported — preserve them so schemas can express constraints.
  delete result.oneOf;
  delete result.not;

  // Remove conditional keywords
  delete result.if;
  delete result.then;
  delete result.else;

  // Remove $ref (needs dereferencing first)
  delete result.$ref;

  // Remove numerical constraints not supported by Anthropic API
  if (result.minimum !== undefined) {
    patches.push({ path, type: 'removed', keyword: 'minimum', detail: `Removed minimum=${result.minimum}` });
    delete result.minimum;
  }
  if (result.maximum !== undefined) {
    patches.push({ path, type: 'removed', keyword: 'maximum', detail: `Removed maximum=${result.maximum}` });
    delete result.maximum;
  }
  if (result.exclusiveMinimum !== undefined) {
    patches.push({ path, type: 'removed', keyword: 'exclusiveMinimum', detail: `Removed exclusiveMinimum=${result.exclusiveMinimum}` });
    delete result.exclusiveMinimum;
  }
  if (result.exclusiveMaximum !== undefined) {
    patches.push({ path, type: 'removed', keyword: 'exclusiveMaximum', detail: `Removed exclusiveMaximum=${result.exclusiveMaximum}` });
    delete result.exclusiveMaximum;
  }
  if (result.multipleOf !== undefined) {
    patches.push({ path, type: 'removed', keyword: 'multipleOf', detail: `Removed multipleOf=${result.multipleOf}` });
    delete result.multipleOf;
  }

  // Remove string constraints not supported
  if (result.minLength !== undefined) {
    patches.push({ path, type: 'removed', keyword: 'minLength', detail: `Removed minLength=${result.minLength}` });
    delete result.minLength;
  }
  if (result.maxLength !== undefined) {
    patches.push({ path, type: 'removed', keyword: 'maxLength', detail: `Removed maxLength=${result.maxLength}` });
    delete result.maxLength;
  }

  // Remove array constraints not supported (keep minItems only if 0 or 1)
  if (result.minItems !== undefined && result.minItems > 1) {
    patches.push({ path, type: 'removed', keyword: 'minItems', detail: `Removed minItems=${result.minItems} (only 0 and 1 supported)` });
    delete result.minItems;
  }
  if (result.maxItems !== undefined) {
    patches.push({ path, type: 'removed', keyword: 'maxItems', detail: `Removed maxItems=${result.maxItems}` });
    delete result.maxItems;
  }
  if (result.uniqueItems !== undefined) {
    patches.push({ path, type: 'removed', keyword: 'uniqueItems', detail: `Removed uniqueItems=${result.uniqueItems}` });
    delete result.uniqueItems;
  }

  // Remove object constraints not supported
  if (result.patternProperties !== undefined) {
    patches.push({ path, type: 'removed', keyword: 'patternProperties', detail: 'Removed patternProperties' });
    delete result.patternProperties;
  }
  if (result.minProperties !== undefined) {
    patches.push({ path, type: 'removed', keyword: 'minProperties', detail: `Removed minProperties=${result.minProperties}` });
    delete result.minProperties;
  }
  if (result.maxProperties !== undefined) {
    patches.push({ path, type: 'removed', keyword: 'maxProperties', detail: `Removed maxProperties=${result.maxProperties}` });
    delete result.maxProperties;
  }

  // Note: do NOT force additionalProperties to false when explicitly set to true —
  // that's a deliberate choice (e.g. widget_display params accepts free-form keys).
  // We only add additionalProperties: false when it's ABSENT (see below).

  // Recursively sanitize nested schemas
  if (result.properties) {
    const sanitizedProps: Record<string, JsonSchema> = {};
    for (const [key, value] of Object.entries(result.properties)) {
      sanitizedProps[key] = typeof value === 'boolean'
        ? value
        : sanitizeSchemaObjectWithReport({ ...value } as JsonSchemaObject, seen, `${path}.properties.${key}`, patches);
    }
    result.properties = sanitizedProps;
  }

  if (result.items) {
    if (Array.isArray(result.items)) {
      result.items = result.items.map((item, i) =>
        typeof item === 'boolean'
          ? item
          : sanitizeSchemaObjectWithReport({ ...item } as JsonSchemaObject, seen, `${path}.items[${i}]`, patches)
      );
    } else if (typeof result.items !== 'boolean') {
      result.items = sanitizeSchemaObjectWithReport({ ...result.items } as JsonSchemaObject, seen, `${path}.items`, patches);
    }
  }

  if (Array.isArray(result.anyOf)) {
    result.anyOf = result.anyOf.map((sub, i) =>
      typeof sub === 'boolean'
        ? sub
        : sanitizeSchemaObjectWithReport({ ...sub } as JsonSchemaObject, seen, `${path}.anyOf[${i}]`, patches)
    );
  }

  if (Array.isArray(result.allOf)) {
    result.allOf = result.allOf.map((sub, i) =>
      typeof sub === 'boolean'
        ? sub
        : sanitizeSchemaObjectWithReport({ ...sub } as JsonSchemaObject, seen, `${path}.allOf[${i}]`, patches)
    );
  }

  // Strict tool use: ensure additionalProperties is set on any object type
  if ((result.type === 'object' || result.properties) && !('additionalProperties' in result)) {
    result.additionalProperties = false;
    patches.push({ path, type: 'additionalProperties', value: false });
  }

  if (result.additionalProperties && typeof result.additionalProperties === 'object') {
    result.additionalProperties = sanitizeSchemaObjectWithReport(
      { ...result.additionalProperties } as JsonSchemaObject,
      seen,
      `${path}.additionalProperties`,
      patches
    );
  }

  return result;
}



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

  // Remove composition keywords unsupported by Anthropic structured outputs.
  // anyOf and allOf are supported — preserve them so schemas can express constraints.
  delete result.oneOf;
  delete result.not;

  // Remove conditional keywords
  delete result.if;
  delete result.then;
  delete result.else;

  // Remove $ref (needs dereferencing first)
  delete result.$ref;

  // Remove numerical constraints not supported by Anthropic API
  delete result.minimum;
  delete result.maximum;
  delete result.exclusiveMinimum;
  delete result.exclusiveMaximum;
  delete result.multipleOf;

  // Remove string constraints not supported
  delete result.minLength;
  delete result.maxLength;

  // Remove array constraints not supported (keep minItems only if 0 or 1)
  if (result.minItems !== undefined && result.minItems > 1) {
    delete result.minItems;
  }
  delete result.maxItems;
  delete result.uniqueItems;

  // Remove object constraints not supported
  delete result.patternProperties;
  delete result.minProperties;
  delete result.maxProperties;

  // Note: do NOT force additionalProperties to false when explicitly set to true —
  // that's a deliberate choice (e.g. widget_display params accepts free-form keys).
  // We only add additionalProperties: false when it's ABSENT (see below).

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

  if (Array.isArray(result.anyOf)) {
    result.anyOf = result.anyOf.map((sub) =>
      typeof sub === 'boolean'
        ? sub
        : sanitizeSchemaObject({ ...sub } as JsonSchemaObject, seen)
    );
  }

  if (Array.isArray(result.allOf)) {
    result.allOf = result.allOf.map((sub) =>
      typeof sub === 'boolean'
        ? sub
        : sanitizeSchemaObject({ ...sub } as JsonSchemaObject, seen)
    );
  }

  // Strict tool use: ensure additionalProperties is set on any object type
  // Anthropic requires this on ALL objects, even without properties
  if ((result.type === 'object' || result.properties) && !('additionalProperties' in result)) {
    result.additionalProperties = false;
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
// flattenSchema — flatten nested object properties for small LLMs
// ---------------------------------------------------------------------------

/**
 * Flatten nested object schemas into flat key__subkey properties.
 * Returns { schema, pathMap } where pathMap maps flat keys to nested paths.
 * Only flattens properties of type "object" with their own properties.
 */
export function flattenSchema(schema: JsonSchema): { schema: JsonSchema; pathMap: Record<string, string[]> } {
  if (typeof schema === 'boolean') return { schema, pathMap: {} };
  const obj = schema as JsonSchemaObject;
  if (!obj.properties) return { schema, pathMap: {} };

  const flatProps: Record<string, JsonSchema> = {};
  const pathMap: Record<string, string[]> = {};
  const required = new Set(obj.required ?? []);
  const flatRequired: string[] = [];

  for (const [key, prop] of Object.entries(obj.properties)) {
    if (typeof prop !== 'boolean' && prop.type === 'object' && prop.properties) {
      // Flatten nested object
      const nestedRequired = new Set((prop as JsonSchemaObject).required ?? []);
      for (const [subKey, subProp] of Object.entries(prop.properties!)) {
        const flatKey = `${key}__${subKey}`;
        flatProps[flatKey] = subProp;
        pathMap[flatKey] = [key, subKey];
        if (required.has(key) && nestedRequired.has(subKey)) {
          flatRequired.push(flatKey);
        }
      }
    } else {
      // Keep as-is
      flatProps[key] = prop;
      pathMap[key] = [key];
      if (required.has(key)) flatRequired.push(key);
    }
  }

  const result: JsonSchemaObject = {
    ...obj,
    properties: flatProps,
  };
  if (flatRequired.length > 0) result.required = flatRequired;
  else delete result.required;

  return { schema: result, pathMap };
}

/**
 * Unflatten params using a pathMap from flattenSchema.
 * Converts { a__b: 1, a__c: 2, d: 3 } back to { a: { b: 1, c: 2 }, d: 3 }
 */
export function unflattenParams(
  params: Record<string, unknown>,
  pathMap: Record<string, string[]>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [flatKey, value] of Object.entries(params)) {
    const path = pathMap[flatKey] ?? flatKey.split('__');
    if (path.length === 1) {
      result[path[0]] = value;
    } else {
      // Build nested structure
      let current = result;
      for (let i = 0; i < path.length - 1; i++) {
        if (!(path[i] in current) || typeof current[path[i]] !== 'object') {
          current[path[i]] = {};
        }
        current = current[path[i]] as Record<string, unknown>;
      }
      current[path[path.length - 1]] = value;
    }
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

