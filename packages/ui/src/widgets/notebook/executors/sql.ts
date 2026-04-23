import { callToolViaPostMessage } from '@webmcp-auto-ui/core';
import type { CellExecutor, CellExecContext, CellResult, DataServerDescriptor } from '../shared.js';

const PATTERN_PRIMARY = /^.*query_sql$/i;
const PATTERN_FALLBACK = /^(query|run|execute)(_sql)?$/i;

function findSqlTool(servers: DataServerDescriptor[]): string | null {
  for (const p of [PATTERN_PRIMARY, PATTERN_FALLBACK]) {
    for (const srv of servers) {
      for (const t of srv.tools ?? []) if (p.test(t.name)) return t.name;
    }
  }
  return null;
}

export function createSqlExecutor(getServers: () => DataServerDescriptor[]): CellExecutor {
  return async (ctx: CellExecContext): Promise<CellResult> => {
    const startedAt = Date.now();
    const toolName = findSqlTool(getServers());
    if (!toolName) {
      return { ok: false, error: 'No SQL tool available on connected servers.', errorKind: 'schema', durationMs: Date.now() - startedAt };
    }
    const sql = (ctx.cell.content ?? '').trim();
    if (!sql) return { ok: true, kind: 'empty', durationMs: Date.now() - startedAt };

    let raw: unknown;
    try {
      raw = await callToolViaPostMessage(toolName, { sql });
    } catch (err) {
      return { ok: false, error: String((err as { message?: unknown })?.message ?? err), errorKind: 'runtime', durationMs: Date.now() - startedAt };
    }
    const durationMs = Date.now() - startedAt;

    const content = (raw as { content?: unknown })?.content;
    const text = Array.isArray(content)
      ? (content.find((c) => (c as { type?: unknown })?.type === 'text') as { text?: string } | undefined)?.text ?? ''
      : '';
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }

    if (!text) return { ok: true, kind: 'empty', durationMs };

    const rows: unknown[] =
      Array.isArray(parsed) ? parsed
      : Array.isArray((parsed as { rows?: unknown })?.rows) ? (parsed as { rows: unknown[] }).rows
      : [];
    if (rows.length && rows.every((r) => r && typeof r === 'object')) {
      const declared = (parsed as { columns?: unknown })?.columns;
      const columns = Array.isArray(declared)
        ? declared.map(String)
        : Array.from(new Set(rows.flatMap((r) => Object.keys(r as Record<string, unknown>))));
      return { ok: true, kind: 'table', rows: rows as Record<string, unknown>[], columns, rowCount: rows.length, durationMs };
    }
    return { ok: true, kind: 'value', value: parsed, durationMs };
  };
}
