// @ts-nocheck
/**
 * Web Worker runtime for executing JS cells in isolation.
 *
 * Receives { code, scope } via postMessage. Builds an async Function with
 * scope keys as parameters, executes it, and posts back { ok, result } or
 * { ok: false, error, errorKind }.
 *
 * Captures console.log/warn/error into a logs[] array returned alongside.
 */

const origLog = (self as any).console?.log?.bind((self as any).console);
const origWarn = (self as any).console?.warn?.bind((self as any).console);
const origErr = (self as any).console?.error?.bind((self as any).console);

self.addEventListener('message', async (e: MessageEvent) => {
  const { code, scope } = (e.data ?? {}) as { code: string; scope: Record<string, unknown> };
  const logs: { level: 'log' | 'warn' | 'error'; args: unknown[] }[] = [];

  // Patch console to capture
  (self as any).console = {
    log: (...args: unknown[]) => {
      logs.push({ level: 'log', args });
      origLog && origLog(...args);
    },
    warn: (...args: unknown[]) => {
      logs.push({ level: 'warn', args });
      origWarn && origWarn(...args);
    },
    error: (...args: unknown[]) => {
      logs.push({ level: 'error', args });
      origErr && origErr(...args);
    },
    info: (...args: unknown[]) => {
      logs.push({ level: 'log', args });
      origLog && origLog(...args);
    },
    debug: (...args: unknown[]) => {
      logs.push({ level: 'log', args });
      origLog && origLog(...args);
    },
  };

  try {
    const keys = Object.keys(scope ?? {});
    const values = keys.map((k) => (scope as any)[k]);
    // Build an async IIFE that returns the last expression via a `return` fallback.
    // We also support implicit-return: if no explicit return, the body is wrapped so the
    // last expression's value is captured. For simplicity and predictability we just
    // require users to use `return` — the cell body is executed as a function body.
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      ...keys,
      'return (async () => {\n' + (code ?? '') + '\n})();'
    );
    const result = await fn(...values);
    (self as any).postMessage({ ok: true, result, logs });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    const isSyntax = err instanceof SyntaxError || /SyntaxError/.test(msg);
    (self as any).postMessage({
      ok: false,
      error: msg,
      errorKind: isSyntax ? 'syntax' : 'runtime',
      logs,
    });
  }
});
