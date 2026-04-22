// @ts-nocheck
// ---------------------------------------------------------------------------
// Extract notebook cells from imported resources (recipe body, tool def, md).
// Consumed by import-modals.ts and left-pane.ts.
// ---------------------------------------------------------------------------

import { parseBody } from '@webmcp-auto-ui/sdk';
import { uid, defaultCellContent } from './shared.js';
import type { NotebookCell, CellType } from './shared.js';

// Languages we map directly to a code cell type
const LANG_TO_TYPE: Record<string, CellType> = {
  sql: 'sql',
  psql: 'sql',
  mysql: 'sql',
  sqlite: 'sql',
  js: 'js',
  javascript: 'js',
  ts: 'js',       // treat TS as js source (stripped at runtime is user's concern)
  typescript: 'js',
  node: 'js',
};

export function fenceLangToCellType(lang: string): CellType | null {
  const key = (lang || '').toLowerCase().trim();
  return LANG_TO_TYPE[key] ?? null;
}

/**
 * Build a notebook cell from a single fence (lang + content).
 * Unsupported languages fall back to a markdown cell wrapping the fence.
 */
export function extractCellFromFence(lang: string, content: string): NotebookCell {
  const cellType = fenceLangToCellType(lang);
  if (cellType) {
    return { id: uid(), type: cellType, content: content.trim(), hideSource: false, hideResult: false };
  }
  // Preserve the original fence in markdown so users see it verbatim
  return {
    id: uid(),
    type: 'md',
    content: '```' + (lang || '') + '\n' + content.trim() + '\n```',
    hideSource: false,
    hideResult: false,
  };
}

/**
 * Extract cells from a full recipe body (markdown with frontmatter already stripped).
 * Returns: a single intro markdown cell (first prose block) + one cell per fenced block.
 */
export function extractCellsFromRecipe(body: string, opts?: { title?: string; description?: string }): NotebookCell[] {
  const cells: NotebookCell[] = [];
  if (opts?.title || opts?.description) {
    const md = ['# ' + (opts?.title ?? 'Imported recipe'), opts?.description ?? ''].filter(Boolean).join('\n\n');
    cells.push({ id: uid(), type: 'md', content: md, hideSource: false, hideResult: false });
  }
  const segments = parseBody(body || '');
  for (const seg of segments) {
    if (seg.type === 'markdown') {
      cells.push({ id: uid(), type: 'md', content: seg.content.trim(), hideSource: false, hideResult: false });
    } else {
      cells.push(extractCellFromFence(seg.lang || 'text', seg.content));
    }
  }
  return cells;
}

/**
 * Produce 2 cells for a tool: md (name + description + schema) + a starter call cell.
 */
export interface McpToolLike {
  name: string;
  description?: string;
  inputSchema?: unknown;
  schema?: unknown;
  serverName?: string;
}

export function extractCellsFromTool(tool: McpToolLike): NotebookCell[] {
  const schema = tool.inputSchema ?? tool.schema ?? {};
  const schemaStr = JSON.stringify(schema, null, 2);
  const mdParts: string[] = [
    `## ${tool.name}${tool.serverName ? ` · \`${tool.serverName}\`` : ''}`,
  ];
  if (tool.description) mdParts.push(tool.description);
  mdParts.push('```json\n' + schemaStr + '\n```');

  const isSql = /(_|^)query_sql$|(^|_)sql_query$/i.test(tool.name);
  const cellType: CellType = isSql ? 'sql' : 'js';
  const template = isSql
    ? '-- call via MCP bridge: ' + tool.name + '\n' + defaultCellContent('sql')
    : '// call via MCP bridge\nawait callTool(' + JSON.stringify(tool.name) + ', {});';

  return [
    { id: uid(), type: 'md', content: mdParts.join('\n\n'), hideSource: false, hideResult: false },
    { id: uid(), type: cellType, content: template, hideSource: false, hideResult: false },
  ];
}

/**
 * Wrap raw markdown content as a single md cell.
 */
export function extractCellFromMarkdown(md: string): NotebookCell {
  return { id: uid(), type: 'md', content: (md || '').trim(), hideSource: false, hideResult: false };
}
