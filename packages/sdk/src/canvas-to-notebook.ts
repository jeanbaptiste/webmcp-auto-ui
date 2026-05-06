/**
 * Canvas → HyperSkill notebook serializer.
 * Each block becomes one or more SQL/JS/MD cells. Dynamic when lineage is
 * present, snapshot fallback otherwise.
 */

export interface WidgetLineage {
  widgetType: string;
  widgetParams: Record<string, unknown>;
  toolCalls: Array<{
    serverName: string;
    toolName: string;
    args: Record<string, unknown>;
    resultPreview?: string;
  }>;
  originRecipe?: string;
}

export interface CanvasToNotebookOptions {
  title?: string;
  description?: string;
  /** Active MCP servers (name, url) — copied as `servers:` in frontmatter. */
  servers?: Array<{ name: string; url: string }>;
  /** Active bundled WebMCP server ids (e.g. ['autoui', 'deckgl']). */
  webmcpServers?: string[];
}

export interface NotebookCell {
  kind: 'sql' | 'js' | 'md';
  content: string;
  varname?: string;
}

export interface CanvasBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

const SQL_TOOL_RE = /(^|[._-])query_sql$|^(query|run|execute)(_sql)?$/i;
const ARRAY_PARAM_KEYS = ['rows', 'data', 'items', 'cards'] as const;

/** Convert a single block + lineage into one or more notebook cells. */
export function lineageToCells(
  block: CanvasBlock,
  lineage: WidgetLineage | null,
): NotebookCell[] {
  const cells: NotebookCell[] = [];

  if (lineage?.originRecipe) {
    cells.push({ kind: 'md', content: `> Generated from recipe: \`${lineage.originRecipe}\`` });
  }

  // Snapshot fallback — no lineage.
  if (!lineage || !lineage.toolCalls || lineage.toolCalls.length === 0) {
    cells.push({
      kind: 'js',
      content: `await widget('${block.type}', ${JSON.stringify(block.data, null, 2)});`,
    });
    return cells;
  }

  // Single SQL tool call → SQL cell + JS widget cell.
  if (lineage.toolCalls.length === 1 && SQL_TOOL_RE.test(lineage.toolCalls[0]!.toolName)) {
    const tc = lineage.toolCalls[0]!;
    const sql = typeof tc.args['sql'] === 'string' ? (tc.args['sql'] as string) : '';
    const varname = 'rows';
    cells.push({ kind: 'sql', content: sql, varname });

    const arrayKey = pickArrayParamKey(lineage.widgetParams);
    let widgetCall: string;
    if (arrayKey) {
      const others = stripKeys(lineage.widgetParams, [arrayKey]);
      const merged = { ...others, [arrayKey]: '__ROWS__' };
      const json = JSON.stringify(merged, null, 2).replace('"__ROWS__"', varname);
      widgetCall = `await widget('${block.type}', ${json});`;
    } else {
      widgetCall = `// TODO: map rows -> widget params\nawait widget('${block.type}', ${JSON.stringify(lineage.widgetParams, null, 2)});`;
    }
    cells.push({ kind: 'js', content: widgetCall });
    return cells;
  }

  // General case — replay tool calls in order.
  const lines: string[] = [];
  lines.push('const unwrap = (r) => (r?.data ?? r?.results ?? r?.items ?? r ?? []);');
  lineage.toolCalls.forEach((tc, i) => {
    lines.push(
      `const r${i} = await call('${tc.serverName}', '${tc.toolName}', ${JSON.stringify(tc.args, null, 2)});`,
    );
  });

  const lastIdx = lineage.toolCalls.length - 1;
  const arrayKey = pickArrayParamKey(lineage.widgetParams);
  if (arrayKey) {
    lines.push(`const ${arrayKey} = unwrap(r${lastIdx});`);
    const others = stripKeys(lineage.widgetParams, [arrayKey]);
    const merged = { ...others, [arrayKey]: '__ITEMS__' };
    const json = JSON.stringify(merged, null, 2).replace('"__ITEMS__"', arrayKey);
    lines.push(`await widget('${block.type}', ${json});`);
  } else {
    lines.push(`await widget('${block.type}', ${JSON.stringify(lineage.widgetParams, null, 2)});`);
  }

  cells.push({ kind: 'js', content: lines.join('\n') });
  return cells;
}

/** Build the full notebook markdown from a snapshot of the canvas. */
export function canvasToNotebookMarkdown(
  blocks: CanvasBlock[],
  getLineage: (blockId: string) => WidgetLineage | null,
  opts: CanvasToNotebookOptions = {},
): string {
  const fm: string[] = ['---'];
  fm.push(`title: ${yamlQuote(opts.title ?? 'Canvas snapshot')}`);
  if (opts.description) fm.push(`description: ${yamlQuote(opts.description)}`);
  if (opts.servers && opts.servers.length > 0) {
    fm.push('servers:');
    for (const s of opts.servers) {
      fm.push(`  - name: ${yamlQuote(s.name)}`);
      fm.push(`    url: ${yamlQuote(s.url)}`);
    }
  }
  if (opts.webmcpServers && opts.webmcpServers.length > 0) {
    fm.push(`webmcp_servers: [${opts.webmcpServers.map((s) => yamlQuote(s)).join(', ')}]`);
  }
  fm.push('---', '');

  const body: string[] = [];
  for (const block of blocks) {
    const cells = lineageToCells(block, getLineage(block.id));
    for (const cell of cells) {
      body.push(renderCell(cell), '');
    }
  }

  return fm.join('\n') + '\n' + body.join('\n').replace(/\n+$/, '') + '\n';
}

function renderCell(cell: NotebookCell): string {
  if (cell.kind === 'md') return cell.content;
  if (cell.kind === 'sql') {
    const meta = cell.varname ? `-- @meta {"varname": "${cell.varname}"}\n` : '';
    return '```sql\n' + meta + cell.content + '\n```';
  }
  return '```js\n' + cell.content + '\n```';
}

function pickArrayParamKey(params: Record<string, unknown>): string | null {
  for (const k of ARRAY_PARAM_KEYS) {
    if (k in params && Array.isArray(params[k])) return k;
  }
  return null;
}

function stripKeys(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!keys.includes(k)) out[k] = v;
  }
  return out;
}

function yamlQuote(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}
