// ---------------------------------------------------------------------------
// @webmcp-auto-ui/core — postMessage bridge
// Listens for webmcp:call-tool events (Chrome extensions, iframe agents)
// and dispatches them to the polyfill executor.
// Zero dependencies. SSR-safe.
// ---------------------------------------------------------------------------

import type {
  WebMCPCallToolEvent,
  WebMCPToolResultEvent,
  WebMCPToolErrorEvent,
  ToolExecuteResult,
  PostMessageBridgeOptions,
} from './types.js';

// Callback type — will be wired to polyfill.executeToolInternal
type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<ToolExecuteResult>;

// Tracks all registered listeners — set-based to avoid clobbering when
// multiple listenForAgentCalls() calls coexist (SSR, tests, multi-iframe).
const messageListeners = new Set<(event: MessageEvent) => void>();

export function listenForAgentCalls(
  executor: ToolExecutor,
  options?: PostMessageBridgeOptions
): () => void {
  const localOptions = options ?? {};

  const listener = (event: MessageEvent) => {
    // Origin check — undefined means skip check; empty array means block all
    if (localOptions.allowedOrigins !== undefined) {
      if (!localOptions.allowedOrigins.includes(event.origin)) return;
    }

    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type !== 'webmcp:call-tool') return;

    const { callId, name, args } = data as WebMCPCallToolEvent;
    if (!callId || !name) return;

    const responseTarget = event.source instanceof Window ? event.source : window;
    const targetOrigin = localOptions.targetOrigin ?? '*';

    executor(name, args ?? {})
      .then((result) => {
        const response: WebMCPToolResultEvent = {
          type: 'webmcp:tool-result',
          callId,
          result,
        };
        responseTarget.postMessage(response, targetOrigin);
      })
      .catch((error) => {
        const response: WebMCPToolErrorEvent = {
          type: 'webmcp:tool-error',
          callId,
          error: error instanceof Error ? error.message : String(error),
        };
        responseTarget.postMessage(response, targetOrigin);
      });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('message', listener);
  }

  messageListeners.add(listener);

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', listener);
    }
    messageListeners.delete(listener);
  };
}

/** @deprecated Use the stop function returned by listenForAgentCalls() instead. */
export function stopListening(): void {
  if (typeof window !== 'undefined') {
    for (const listener of messageListeners) {
      window.removeEventListener('message', listener);
    }
  }
  messageListeners.clear();
}

/**
 * Helper for agents / Chrome extensions that want to call a tool via
 * postMessage and get the result as a Promise.
 */
export function callToolViaPostMessage(
  name: string,
  args: Record<string, unknown>,
  options?: { timeout?: number; targetWindow?: Window } & PostMessageBridgeOptions
): Promise<ToolExecuteResult> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('callToolViaPostMessage: window is not available (SSR?)'));
  }

  const callId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const target = options?.targetWindow ?? window;
  const timeout = options?.timeout ?? 30_000;
  const targetOrigin = options?.targetOrigin ?? '*';
  const allowedOrigins = options?.allowedOrigins;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error(`Tool call "${name}" timed out after ${timeout}ms`));
    }, timeout);

    function handler(event: MessageEvent) {
      // Origin check for responses — undefined means skip check; empty array means block all
      if (allowedOrigins !== undefined) {
        if (!allowedOrigins.includes(event.origin)) return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.callId !== callId) return;

      if (data.type === 'webmcp:tool-result') {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        resolve((data as WebMCPToolResultEvent).result);
      } else if (data.type === 'webmcp:tool-error') {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        reject(new Error((data as WebMCPToolErrorEvent).error));
      }
    }

    window.addEventListener('message', handler);

    const request: WebMCPCallToolEvent = {
      type: 'webmcp:call-tool',
      callId,
      name,
      args,
    };
    target.postMessage(request, targetOrigin);
  });
}

/** Type guard — returns true if data looks like any webmcp:* event. */
export function isWebMCPEvent(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const type = (data as Record<string, unknown>).type;
  return typeof type === 'string' && type.startsWith('webmcp:');
}
