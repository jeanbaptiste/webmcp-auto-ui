// @ts-nocheck
/**
 * SQL executor for notebook cells.
 *
 * Finds a SQL-capable tool on the connected data servers via auto-pattern,
 * calls it via postMessage, parses the result into a `table` CellResult.
 */

import { callToolViaPostMessage } from '@webmcp-auto-ui/core';
import type { CellExecutor, CellExecContext, DataServerDescriptor } from '../shared.js';

export interface SqlExecutorOptions {
  /** Timeout per query (ms). Default 30000 */
  timeoutMs?: number;
  /** Max rows to keep in result (truncate beyond). Default 1000 */
  maxRows?: number;
}

const PATTERN_PRIMARY = /^.*query_sql$/i;
const PATTERN_FALLBACK = /^(query|run|execute)(_sql)?$/i;

function findSqlTool(servers: DataServerDescriptor[]): string | null {
  // Priority 1: *_query_sql or query_sql
  for (const srv of servers) {
    for (const t of srv.tools ?? []) {
      if (PATTERN_PRIMARY.test(t.name)) return t.name;
    }
  }
  // Priority 2: query / run / execute (with optional _sql)
  for (const srv of servers) {
    for (const t of srv.tools ?? []) {
      if (PATTERN_FALLBACK.test(t.name)) return t.name;
    }
  }
  return null;
}

/**
 * Extract the first text content from an MCP tool result.
 */
function extractText(result: any): string | null {
  if (!result) return null;
  const content = result.content ?? result;
  if (!Array.isArray(content)) {
    if (typeof content === 'string') return content;
    return null;
  }
  for (const item of content) {
    if (item && item.type === 'text' && typeof item.text === 'string') {
      return item.text;
    }
  }
  return null;
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text; // not JSON, return raw
  }
}

export function createSqlExecutor(
  getServers: () => DataServerDescriptor[],
  opts?: SqlExecutorOptions
): CellExecutor {
  const timeoutMs = opts?.timeoutMs ?? 30_000;
  const maxRows = opts?.maxRows ?? 1000;

  return async (ctx: CellExecContext) => {
    const startedAt = Date.now();
    const servers = getServers();

    const toolName = findSqlTool(servers);
    if (!toolName) {
      return {
        ok: false,
        error: 'No SQL tool found on connected servers',
        errorKind: 'schema',
        durationMs: Date.now() - startedAt,
      };
    }

    const sql = (ctx.cell.content ?? '').trim();
    if (!sql) {
      return { ok: true, kind: 'empty', durationMs: Date.now() - startedAt };
    }

    // Wrap the tool call with the cell's AbortSignal so an external abort
    // rejects the promise even if callToolViaPostMessage doesn't support signals.
    const callPromise = callToolViaPostMessage(toolName, { sql }, { timeout: timeoutMs });

    let raceResult: any;
    try {
      raceResult = await new Promise((resolve, reject) => {
        let settled = false;
        const onAbort = () => {
          if (settled) return;
          settled = true;
          reject(new Error('aborted'));
        };
        if (ctx.signal.aborted) {
          onAbort();
          return;
        }
        ctx.signal.addEventListener('abort', onAbort, { once: true });
        callPromise.then(
          (v) => {
            if (settled) return;
            settled = true;
            ctx.signal.removeEventListener('abort', onAbort);
            resolve(v);
          },
          (err) => {
            if (settled) return;
            settled = true;
            ctx.signal.removeEventListener('abort', onAbort);
            reject(err);
          }
        );
      });
    } catch (err: any) {
      const durationMs = Date.now() - startedAt;
      const msg = String(err?.message ?? err);
      const isTimeout = /timed out|aborted/i.test(msg);
      return {
        ok: false,
        error: msg,
        errorKind: isTimeout ? 'timeout' : 'runtime',
        durationMs,
      };
    }

    const durationMs = Date.now() - startedAt;

    // Unwrap MCP content array → text → JSON.
    const text = extractText(raceResult);
    const parsed = text != null ? tryParseJson(text) : raceResult;

    // Error shape returned inside the tool result
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'error' in (parsed as any) && (parsed as any).error) {
      return {
        ok: false,
        error: String((parsed as any).error),
        errorKind: 'runtime',
        durationMs,
      };
    }

    // {rows, columns} shape
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray((parsed as any).rows)) {
      let rows: Record<string, unknown>[] = (parsed as any).rows;
      const columns: string[] = Array.isArray((parsed as any).columns)
        ? (parsed as any).columns
        : rows.length > 0 && typeof rows[0] === 'object'
          ? Object.keys(rows[0] as Record<string, unknown>)
          : [];
      let truncated = false;
      if (rows.length > maxRows) {
        rows = rows.slice(0, maxRows);
        truncated = true;
      }
      return {
        ok: true,
        kind: 'table',
        rows,
        columns,
        rowCount: (parsed as any).rows.length,
        truncated: truncated || undefined,
        durationMs,
      };
    }

    // Array of objects
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return { ok: true, kind: 'table', rows: [], columns: [], rowCount: 0, durationMs };
      }
      const first = parsed[0];
      if (first && typeof first === 'object' && !Array.isArray(first)) {
        let rows = parsed as Record<string, unknown>[];
        const columns = Object.keys(first as Record<string, unknown>);
        const rowCount = rows.length;
        let truncated = false;
        if (rows.length > maxRows) {
          rows = rows.slice(0, maxRows);
          truncated = true;
        }
        return {
          ok: true,
          kind: 'table',
          rows,
          columns,
          rowCount,
          truncated: truncated || undefined,
          durationMs,
        };
      }
      return { ok: true, kind: 'value', value: parsed, durationMs };
    }

    // Anything else — a scalar or object that isn't tabular
    return { ok: true, kind: 'value', value: parsed, durationMs };
  };
}
