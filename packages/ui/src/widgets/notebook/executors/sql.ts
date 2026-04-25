import { callToolViaPostMessage } from '@webmcp-auto-ui/core';
import { findCodeParamName, buildToolArgs } from '@webmcp-auto-ui/sdk';
import type { CellExecutor, CellExecContext, CellResult, DataServerDescriptor, DataServerTool } from '../shared.js';

const PATTERN_PRIMARY = /^.*query_sql$/i;
const PATTERN_FALLBACK = /^(query|run|execute)(_sql)?$/i;

function findSqlTool(servers: DataServerDescriptor[]): DataServerTool | null {
  for (const p of [PATTERN_PRIMARY, PATTERN_FALLBACK]) {
    for (const srv of servers) {
      for (const t of srv.tools ?? []) if (p.test(t.name)) return t;
    }
  }
  return null;
}

export function createSqlExecutor(getServers: () => DataServerDescriptor[]): CellExecutor {
  return async (ctx: CellExecContext): Promise<CellResult> => {
    const startedAt = Date.now();
    const tool = findSqlTool(getServers());
    if (!tool) {
      return { ok: false, error: 'No SQL tool available on connected servers.', errorKind: 'schema', durationMs: Date.now() - startedAt };
    }
    const sql = (ctx.cell.content ?? '').trim();
    if (!sql) return { ok: true, kind: 'empty', durationMs: Date.now() - startedAt };

    // Build args from the tool's inputSchema:
    //  1. Pick the code-carrying param (query / sql / statement / ...) via findCodeParamName.
    //  2. Auto-infer required params (e.g. `schema` enum from FROM/JOIN regex).
    //  3. Merge cell-level overrides from cell.args (parsed from `-- @meta {...}` line).
    const codeParam = findCodeParamName(tool.inputSchema) ?? 'sql';
    const auto = buildToolArgs(tool.inputSchema, codeParam, sql, 'sql');
    const args: Record<string, unknown> = { ...auto, ...(ctx.cell.args ?? {}) };
    // Code param is owned by the cell content, never overridable via @meta
    args[codeParam] = sql;

    let raw: unknown;
    try {
      raw = await callToolViaPostMessage(tool.name, args);
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
