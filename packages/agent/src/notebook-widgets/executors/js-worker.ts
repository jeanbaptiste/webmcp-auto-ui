// @ts-nocheck
/**
 * JS executor — runs cell content in a Web Worker, with state.scope exposed
 * as top-level variables inside the worker's async function body.
 *
 * Output shape detection:
 *   - Array of objects    → kind: 'table'
 *   - Array of scalars    → kind: 'value'
 *   - Vega / Vega-Lite spec → kind: 'chart'
 *   - undefined / null    → kind: 'empty'
 *   - Otherwise           → kind: 'value'
 */

import type { CellExecutor, CellExecContext, CellResult } from '../shared.js';

export interface JsExecutorOptions {
  /** Timeout (ms). Default 5000 */
  timeoutMs?: number;
}

function isChartSpec(v: any): boolean {
  if (!v || typeof v !== 'object') return false;
  // Vega
  if (Array.isArray(v.marks)) return true;
  // Vega-Lite
  if (v.mark && (typeof v.mark === 'string' || typeof v.mark === 'object')) return true;
  if (v.layer && Array.isArray(v.layer)) return true;
  if (v.data && (v.encoding || v.mark)) return true;
  return false;
}

/**
 * Convert the worker's raw log entries ({level, args}) into a flat string[]
 * suitable for CellResult.logs. Each entry becomes one line, with
 * `[warn]` / `[error]` prefixes for non-log levels (used for color coding).
 */
function normalizeLogs(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: string[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const level = (entry as any).level as string | undefined;
    const args = (entry as any).args as unknown[] | undefined;
    const body = Array.isArray(args)
      ? args.map((a) => {
          if (a == null) return String(a);
          if (typeof a === 'object') { try { return JSON.stringify(a); } catch { return String(a); } }
          return String(a);
        }).join(' ')
      : '';
    const prefix = level === 'warn' ? '[warn] ' : level === 'error' ? '[error] ' : '';
    out.push(prefix + body);
  }
  return out.length ? out : undefined;
}

function toResult(value: unknown, durationMs: number): CellResult {
  if (value === undefined || value === null) {
    return { ok: true, kind: 'empty', durationMs };
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
      const columns = Object.keys(value[0] as Record<string, unknown>);
      return {
        ok: true,
        kind: 'table',
        rows: value as Record<string, unknown>[],
        columns,
        rowCount: value.length,
        durationMs,
      };
    }
    return { ok: true, kind: 'value', value, durationMs };
  }
  if (typeof value === 'object') {
    if (isChartSpec(value)) {
      return { ok: true, kind: 'chart', spec: value, durationMs };
    }
    return { ok: true, kind: 'value', value, durationMs };
  }
  return { ok: true, kind: 'value', value, durationMs };
}

/**
 * Build the worker source inline so the executor ships as a single module
 * without relying on bundler-specific `new URL(..., import.meta.url)` resolution.
 */
function buildWorkerBlobUrl(): string {
  const src = `
    const origLog = self.console && self.console.log ? self.console.log.bind(self.console) : null;
    const origWarn = self.console && self.console.warn ? self.console.warn.bind(self.console) : null;
    const origErr = self.console && self.console.error ? self.console.error.bind(self.console) : null;

    self.addEventListener('message', async (e) => {
      const data = e.data || {};
      const code = data.code || '';
      const scope = data.scope || {};
      const logs = [];
      self.console = {
        log:  function () { logs.push({ level: 'log',   args: [].slice.call(arguments) }); origLog  && origLog.apply(null, arguments); },
        warn: function () { logs.push({ level: 'warn',  args: [].slice.call(arguments) }); origWarn && origWarn.apply(null, arguments); },
        error:function () { logs.push({ level: 'error', args: [].slice.call(arguments) }); origErr  && origErr.apply(null, arguments); },
        info: function () { logs.push({ level: 'log',   args: [].slice.call(arguments) }); origLog  && origLog.apply(null, arguments); },
        debug:function () { logs.push({ level: 'log',   args: [].slice.call(arguments) }); origLog  && origLog.apply(null, arguments); },
      };
      try {
        const keys = Object.keys(scope);
        const values = keys.map(function (k) { return scope[k]; });
        const fn = new Function.apply(null, keys.concat(['return (async () => {\\n' + code + '\\n})();']));
        const result = await fn.apply(null, values);
        self.postMessage({ ok: true, result: result, logs: logs });
      } catch (err) {
        const msg = String((err && err.message) || err);
        const isSyntax = (err instanceof SyntaxError) || /SyntaxError/.test(msg);
        self.postMessage({ ok: false, error: msg, errorKind: isSyntax ? 'syntax' : 'runtime', logs: logs });
      }
    });
  `;
  const blob = new Blob([src], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

// Cache the blob URL across executor calls — workers themselves are disposable
// but recreating the blob on each run wastes object URLs.
let cachedWorkerUrl: string | null = null;
function getWorkerUrl(): string {
  if (cachedWorkerUrl) return cachedWorkerUrl;
  cachedWorkerUrl = buildWorkerBlobUrl();
  return cachedWorkerUrl;
}

/**
 * Best-effort structured-clone check: filter out values that can't be posted
 * to a worker (functions, DOM nodes, etc.). Replaces them with undefined so
 * the cell can still reference the scope variable without crashing postMessage.
 */
function sanitizeScope(scope: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(scope ?? {})) {
    if (typeof v === 'function') continue;
    if (v && typeof v === 'object') {
      // Quick cheap check: Nodes, Windows, etc.
      const ctor = (v as any).constructor?.name;
      if (ctor === 'Window' || ctor === 'HTMLDocument' || (v as any).nodeType != null) continue;
    }
    out[k] = v;
  }
  return out;
}

export function createJsExecutor(opts?: JsExecutorOptions): CellExecutor {
  const timeoutMs = opts?.timeoutMs ?? 5_000;

  return async (ctx: CellExecContext) => {
    const startedAt = Date.now();

    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
      return {
        ok: false,
        error: 'Web Worker not available in this environment',
        errorKind: 'runtime',
        durationMs: Date.now() - startedAt,
      };
    }

    const code = ctx.cell.content ?? '';
    if (!code.trim()) {
      return { ok: true, kind: 'empty', durationMs: Date.now() - startedAt };
    }

    const scope = sanitizeScope(ctx.scope ?? {});
    const worker = new Worker(getWorkerUrl());

    return new Promise<CellResult>((resolve) => {
      let done = false;
      const finish = (r: CellResult) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        ctx.signal.removeEventListener('abort', onAbort);
        try {
          worker.terminate();
        } catch {
          /* noop */
        }
        resolve(r);
      };

      const timer = setTimeout(() => {
        finish({
          ok: false,
          error: `JS cell timed out after ${timeoutMs}ms`,
          errorKind: 'timeout',
          durationMs: Date.now() - startedAt,
        });
      }, timeoutMs);

      const onAbort = () => {
        finish({
          ok: false,
          error: 'aborted',
          errorKind: 'timeout',
          durationMs: Date.now() - startedAt,
        });
      };
      if (ctx.signal.aborted) {
        onAbort();
        return;
      }
      ctx.signal.addEventListener('abort', onAbort, { once: true });

      worker.addEventListener('message', (e: MessageEvent) => {
        const msg = e.data as
          | { ok: true; result: unknown; logs?: unknown[] }
          | { ok: false; error: string; errorKind?: 'syntax' | 'runtime'; logs?: unknown[] };
        const durationMs = Date.now() - startedAt;
        if (!msg || typeof msg !== 'object') {
          finish({ ok: false, error: 'Invalid worker response', errorKind: 'runtime', durationMs });
          return;
        }
        const logs = normalizeLogs((msg as any).logs);
        if (msg.ok) {
          const base = toResult((msg as any).result, durationMs);
          finish(logs ? { ...base, logs } as CellResult : base);
        } else {
          finish({
            ok: false,
            error: (msg as any).error || 'Unknown error',
            errorKind: (msg as any).errorKind === 'syntax' ? 'syntax' : 'runtime',
            durationMs,
            logs,
          });
        }
      });

      worker.addEventListener('error', (e: ErrorEvent) => {
        finish({
          ok: false,
          error: e.message || 'Worker error',
          errorKind: 'runtime',
          durationMs: Date.now() - startedAt,
        });
      });

      try {
        worker.postMessage({ code, scope });
      } catch (err: any) {
        finish({
          ok: false,
          error: `Failed to post scope to worker: ${String(err?.message ?? err)}`,
          errorKind: 'runtime',
          durationMs: Date.now() - startedAt,
        });
      }
    });
  };
}
