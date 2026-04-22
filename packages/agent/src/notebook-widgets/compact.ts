// @ts-nocheck
// ---------------------------------------------------------------------------
// notebook-compact — reactive minimalist layout (marimo-like)
// Left gutter with type label + vertical line, named outputs, fresh/stale status.
// ---------------------------------------------------------------------------

import {
  createState, injectStyles, mountRunControls, mountHistoryPanel,
  setupDnD, deleteCellWithConfirm, restoreCellFromSnapshot, addCell,
  addImportedCells, registerExecutor, collectDataServers,
  autosize, openShareModal, registerHistoryObserver,
  buildServersButton,
  type NotebookState, type NotebookCell, type CellResult, type CellExecContext,
} from './shared.js';
import { dispatchShare } from './share-handlers.js';
import { renderProse } from './prose.js';
import { openAddMdModal, openAddRecipeModal } from './import-modals.js';
import {
  extractCellsFromRecipe, extractCellFromMarkdown,
} from './resource-extractor.js';
import { mountLeftPane } from './left-pane.js';
import { callToolViaPostMessage } from '@webmcp-auto-ui/core';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  injectStyles();
  injectLayoutStyles();

  const state: NotebookState = createState({
    id: data.id as string,
    title: data.title as string,
    mode: (data.mode as any) ?? 'edit',
    cells: data.cells as any,
  });

  // --- register executors ---------------------------------------------------
  registerExecutor(state, 'js', jsExecutor);
  registerExecutor(state, 'sql', makeSqlExecutor(data));

  container.classList.add('nb-root');
  container.classList.toggle('nb-view-mode', state.mode === 'view');

  container.innerHTML = `
    <div class="nbc-outer">
      <div class="nbc-leftpane-slot"></div>
      <div class="nbc-shell">
        <div class="nbc-toolbar">
          <div class="nbc-status">
            <span class="nbc-status-dot"></span>
            <span class="nbc-status-text">reactive · 0 cells</span>
          </div>
          <div class="nbc-actions">
            <div class="nb-mode-switch">
              <button class="nb-mode-edit nb-on">edit</button>
              <button class="nb-mode-view">view</button>
            </div>
            <button class="nb-btn nb-add-cell" data-add="sql">+ sql</button>
            <button class="nb-btn nb-add-cell" data-add="js">+ js</button>
            <button class="nb-btn nb-add-cell" data-add-modal="md">+ md</button>
            <button class="nb-btn nb-add-cell" data-add-modal="recipe">+ recipe</button>
            <button class="nb-btn nbc-history-btn">⟲ history</button>
            <span class="nbc-servers-slot"></span>
            <button class="nb-btn nbc-share-btn">share</button>
          </div>
        </div>
        <div class="nb-history-panel nbc-history-panel"></div>
        <div class="nbc-cells"></div>
      </div>
    </div>`;

  const outer = container.querySelector('.nbc-outer') as HTMLElement;
  const shell = container.querySelector('.nbc-shell') as HTMLElement;
  const leftPaneHost = container.querySelector('.nbc-leftpane-slot') as HTMLElement;
  const cellsEl = shell.querySelector('.nbc-cells') as HTMLElement;
  const historyPanel = shell.querySelector('.nbc-history-panel') as HTMLElement;

  // active index for imports: last focused/edited cell, else end
  let lastActiveIdx: number | null = null;
  function activeIdx(): number | null {
    if (lastActiveIdx != null && lastActiveIdx >= 0 && lastActiveIdx < state.cells.length) {
      return lastActiveIdx;
    }
    return null;
  }

  function renderCells() {
    cellsEl.innerHTML = '';
    state.cells.forEach((cell, idx) => {
      const node = renderCell(cell, state, rerender);
      node.addEventListener('focusin', () => { lastActiveIdx = idx; });
      cellsEl.appendChild(node);
    });
    updateStatus();
  }

  function updateStatus() {
    const n = state.cells.length;
    const stale = state.cells.filter((c) => c.status === 'stale').length;
    (shell.querySelector('.nbc-status-text') as HTMLElement).textContent =
      stale > 0 ? `reactive · ${n} cells · ${stale} stale` : `reactive · ${n} cells · synced`;
    (shell.querySelector('.nbc-status-dot') as HTMLElement).classList.toggle('nbc-stale', stale > 0);
  }

  function rerender() {
    mountHistoryPanel(historyPanel, state, (snap) => { restoreCellFromSnapshot(state, snap); rerender(); });
    renderCells();
  }

  // Toolbar: direct add (sql/js)
  shell.querySelectorAll<HTMLElement>('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.add as any;
      addCell(state, type, { varname: type === 'sql' ? 'rows_' + (state.cells.length + 1) : undefined });
      rerender();
    });
  });

  // Toolbar: modal add (md / recipe)
  shell.querySelectorAll<HTMLElement>('[data-add-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const which = btn.dataset.addModal;
      if (which === 'md') {
        openAddMdModal((content) => {
          const cell = extractCellFromMarkdown(content);
          addImportedCells(state, [cell], activeIdx());
          rerender();
        });
      } else if (which === 'recipe') {
        const mcpServers = (Array.isArray((data as any)?.servers) ? (data as any).servers : [])
          .map((s: any) => ({ name: String(s?.name ?? ''), url: s?.url ? String(s.url) : undefined }))
          .filter((s: any) => s.name);
        openAddRecipeModal({
          mcpServers,
          onPick: (recipe) => {
            const cells = extractCellsFromRecipe(recipe.body ?? '', {
              title: recipe.name, description: recipe.description,
            });
            addImportedCells(state, cells, activeIdx());
            rerender();
          },
        });
      }
    });
  });

  (shell.querySelector('.nbc-history-btn') as HTMLElement).addEventListener('click', () => {
    historyPanel.classList.toggle('nb-open');
  });
  (shell.querySelector('.nbc-share-btn') as HTMLElement).addEventListener('click', () => {
    openShareModal(state, (fmt) => {
      dispatchShare(fmt, state, {
        container,
        onResult: (info) => console.log('[notebook-compact share]', info),
      });
    });
  });
  const editBtn = shell.querySelector('.nb-mode-edit') as HTMLElement;
  const viewBtn = shell.querySelector('.nb-mode-view') as HTMLElement;
  editBtn.addEventListener('click', () => {
    state.mode = 'edit';
    container.classList.remove('nb-view-mode');
    editBtn.classList.add('nb-on'); viewBtn.classList.remove('nb-on');
    rerender();
  });
  viewBtn.addEventListener('click', () => {
    state.mode = 'view';
    container.classList.add('nb-view-mode');
    viewBtn.classList.add('nb-on'); editBtn.classList.remove('nb-on');
    rerender();
  });

  buildServersButton(state, shell.querySelector('.nbc-servers-slot') as HTMLElement, data, rerender);

  // Left pane (collapsed by default)
  const pane = mountLeftPane(leftPaneHost, state, collectDataServers(data), {
    onInjectCells: (cells) => {
      addImportedCells(state, cells, activeIdx());
      rerender();
    },
  });

  // Keep pane servers in sync with canvas changes
  let canvasUnsub: (() => void) | null = null;
  try {
    const canvasAny: any = (globalThis as any).__canvasVanilla || (globalThis as any).canvasVanilla;
    if (canvasAny?.subscribe) {
      canvasUnsub = canvasAny.subscribe(() => pane.setServers(collectDataServers(data)));
    }
  } catch { /* ignore */ }

  setupDnD(cellsEl, state, rerender);
  const unsubHistory = registerHistoryObserver(() => mountHistoryPanel(historyPanel, state, (snap) => { restoreCellFromSnapshot(state, snap); rerender(); }));

  rerender();

  return () => {
    unsubHistory();
    canvasUnsub?.();
    pane.destroy();
  };
}

// ---------------------------------------------------------------------------
// Executors
// ---------------------------------------------------------------------------

async function jsExecutor(ctx: CellExecContext): Promise<CellResult> {
  const start = Date.now();
  const { cell, scope } = ctx;
  try {
    const keys = Object.keys(scope);
    const values = keys.map((k) => scope[k]);
    // Wrap body so bare expressions get returned (mimics REPL).
    const src = cell.content.trim();
    const body = /^\s*(return|var|let|const|function|class|if|for|while|\/\/|\/\*)/.test(src)
      ? src
      : `return (async () => { return (${src}); })();`;
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, body);
    let result = fn(...values);
    if (result && typeof result.then === 'function') result = await result;
    const durationMs = Date.now() - start;

    if (result === undefined || result === null) return { ok: true, kind: 'empty', durationMs };
    if (Array.isArray(result)) {
      const rows = result.filter((r) => r && typeof r === 'object') as Record<string, unknown>[];
      const columns = rows.length ? Array.from(new Set(rows.flatMap((r) => Object.keys(r)))) : [];
      return { ok: true, kind: 'table', rows, columns, rowCount: rows.length, durationMs };
    }
    if (result && typeof result === 'object') {
      const r: any = result;
      if (r.data || r.marks || r.mark || r.$schema) {
        return { ok: true, kind: 'chart', spec: result, durationMs };
      }
    }
    return { ok: true, kind: 'value', value: result, durationMs };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err), errorKind: 'runtime', durationMs: Date.now() - start };
  }
}

function makeSqlExecutor(data: Record<string, unknown>) {
  return async function sqlExecutor(ctx: CellExecContext): Promise<CellResult> {
    const start = Date.now();
    const sql = ctx.cell.content;
    // Find a suitable SQL tool among connected servers.
    const servers = collectDataServers(data);
    const candidates: string[] = [];
    for (const srv of servers) {
      for (const t of srv.tools ?? []) candidates.push(t.name);
    }
    const precise = candidates.find((n) => /^.*query_sql$/i.test(n));
    const loose = precise ?? candidates.find((n) => /^(query|run|execute)(_sql)?$/i.test(n));
    const toolName = precise ?? loose;
    if (!toolName) {
      return {
        ok: false,
        error: 'No SQL tool available on connected servers (looked for *query_sql or query/run/execute).',
        errorKind: 'schema',
        durationMs: Date.now() - start,
      };
    }
    try {
      const res: any = await callToolViaPostMessage(toolName, { sql });
      const text = res?.content?.find?.((c: any) => c.type === 'text')?.text ?? '';
      const durationMs = Date.now() - start;
      // Try JSON first
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* not JSON */ }
      if (parsed) {
        // Common shapes: array of rows, {rows:[...]}, {data:[...]}
        const rows: any[] = Array.isArray(parsed) ? parsed
          : Array.isArray(parsed?.rows) ? parsed.rows
          : Array.isArray(parsed?.data) ? parsed.data
          : Array.isArray(parsed?.results) ? parsed.results
          : [];
        if (rows.length && rows.every((r) => r && typeof r === 'object')) {
          const columns = Array.isArray(parsed?.columns)
            ? parsed.columns.map(String)
            : Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
          return { ok: true, kind: 'table', rows, columns, rowCount: rows.length, durationMs };
        }
        return { ok: true, kind: 'value', value: parsed, durationMs };
      }
      if (!text) return { ok: true, kind: 'empty', durationMs };
      return { ok: true, kind: 'value', value: text, durationMs };
    } catch (err: any) {
      return { ok: false, error: String(err?.message ?? err), errorKind: 'runtime', durationMs: Date.now() - start };
    }
  };
}

// ---------------------------------------------------------------------------
// Cell rendering (compact layout)
// ---------------------------------------------------------------------------

function renderCell(cell: NotebookCell, state: NotebookState, rerender: () => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'nb-cell-wrapper nbc-cell';
  wrap.dataset.id = cell.id;

  const row = document.createElement('div');
  row.className = 'nbc-row';

  const handle = document.createElement('span');
  handle.className = 'nb-drag-handle';
  handle.draggable = true;
  handle.textContent = '⋮⋮';
  row.appendChild(handle);

  const gutter = document.createElement('div');
  gutter.className = `nbc-gutter nbc-gutter-${cell.type}`;
  gutter.innerHTML = `
    <span class="nbc-type-label">${cell.type}</span>
    ${cell.varname ? `<span class="nbc-gutter-var">→ ${escapeHtml(cell.varname)}</span>` : ''}
    <span class="nbc-line"></span>`;
  row.appendChild(gutter);

  const body = document.createElement('div');
  body.className = 'nbc-body';
  body.style.minWidth = '0';

  if (cell.type === 'md') {
    const mdBody = document.createElement('div');
    mdBody.className = 'nbc-md-body';
    if (state.mode === 'view') {
      const rendered = document.createElement('div');
      rendered.className = 'nb-md-render';
      rendered.innerHTML = renderProse(cell.content || '');
      mdBody.appendChild(rendered);
    } else {
      const ta = document.createElement('textarea');
      ta.className = 'nb-md-edit';
      ta.value = cell.content;
      ta.rows = 2;
      ta.placeholder = 'write markdown…';
      ta.addEventListener('input', () => { cell.content = ta.value; autosize(ta); });
      mdBody.appendChild(ta);
      setTimeout(() => autosize(ta), 0);
    }
    body.appendChild(mdBody);

    const del = document.createElement('button');
    del.className = 'nb-icon-btn nb-danger nbc-md-del';
    del.textContent = '✕';
    del.title = 'delete cell';
    del.addEventListener('click', () => deleteCellWithConfirm(state, cell, () => 'markdown cell', rerender));
    wrap.appendChild(del);
  } else {
    const codeCell = document.createElement('div');
    codeCell.className = 'nb-code-cell nbc-code-cell';

    // Cell title row with run controls FIRST (left), then meta
    const titleRow = document.createElement('div');
    titleRow.className = 'nbc-title-row';
    titleRow.innerHTML = `
      <span class="nbc-run-controls"></span>
      ${cell.varname ? `<span class="nbc-arrow-var">→ ${escapeHtml(cell.varname)}</span>` : ''}
      <span class="nbc-meta-info">${metaInfoFor(cell)}</span>
      <button class="nb-icon-btn nb-toggle-src">${cell.hideSource ? '▸ src' : '◂ src'}</button>
      <button class="nb-icon-btn nb-toggle-res">${cell.hideResult ? '▸ res' : '◂ res'}</button>
      <button class="nb-icon-btn nb-danger nbc-code-del">✕</button>
    `;
    codeCell.appendChild(titleRow);
    mountRunControls(titleRow.querySelector('.nbc-run-controls') as HTMLElement, cell, wrap, state, rerender);

    const codeBody = document.createElement('div');
    codeBody.className = 'nbc-code-body' + (cell.hideSource ? ' nbc-hidden' : '');
    const ta = document.createElement('textarea');
    ta.className = 'nb-code-edit';
    ta.value = cell.content;
    ta.rows = 1;
    ta.spellcheck = false;
    ta.addEventListener('input', () => { cell.content = ta.value; autosize(ta); cell.status = 'stale'; updateStatusDot(wrap); });
    codeBody.appendChild(ta);
    codeCell.appendChild(codeBody);
    setTimeout(() => autosize(ta), 0);

    const result = document.createElement('div');
    result.className = 'nbc-result-body' + (cell.hideResult ? ' nbc-hidden' : '');
    renderResultInto(result, cell);
    codeCell.appendChild(result);
    body.appendChild(codeCell);

    (titleRow.querySelector('.nb-toggle-src') as HTMLElement).addEventListener('click', () => { cell.hideSource = !cell.hideSource; rerender(); });
    (titleRow.querySelector('.nb-toggle-res') as HTMLElement).addEventListener('click', () => { cell.hideResult = !cell.hideResult; rerender(); });
    (titleRow.querySelector('.nbc-code-del') as HTMLElement).addEventListener('click', () =>
      deleteCellWithConfirm(state, cell, (c) => `${c.type} cell${c.varname ? ' → ' + c.varname : ''}`, rerender)
    );
  }

  row.appendChild(body);
  wrap.appendChild(row);

  // fresh / stale stripe on the gutter
  wrap.classList.toggle('nbc-fresh', cell.status === 'fresh');
  wrap.classList.toggle('nbc-stale', cell.status === 'stale');

  return wrap;
}

function updateStatusDot(_wrap: HTMLElement): void {
  // Placeholder: stripe updates happen on full rerender; keeps edit reactivity cheap.
}

function metaInfoFor(cell: NotebookCell): string {
  const r = cell.lastResult;
  if (!r) return cell.status === 'stale' ? 'stale · click ▶ to run' : '—';
  if (!r.ok) return 'error';
  if (r.kind === 'table') return `${r.rowCount} row${r.rowCount === 1 ? '' : 's'}`;
  if (r.kind === 'value') return typeof r.value === 'object' && r.value !== null ? 'object' : typeof r.value;
  if (r.kind === 'chart') return 'chart';
  return 'empty';
}

function renderResultInto(el: HTMLElement, cell: NotebookCell): void {
  const r = cell.lastResult;
  if (!r) {
    el.innerHTML = `<div class="nbc-result-empty">click ▶ to run</div>`;
    return;
  }
  if (!r.ok) {
    el.innerHTML = `<div class="nbc-result-error">${escapeHtml(r.error || 'error')}</div>`;
    return;
  }
  if (r.kind === 'empty') {
    el.innerHTML = `<div class="nbc-result-empty">(no output)</div>`;
    return;
  }
  if (r.kind === 'value') {
    const s = safeJson(r.value);
    el.innerHTML = `<pre class="nbc-result-pre">${escapeHtml(s)}</pre>`;
    return;
  }
  if (r.kind === 'chart') {
    const s = safeJson(r.spec);
    el.innerHTML = `<div class="nbc-result-chart-hint">chart spec</div><pre class="nbc-result-pre">${escapeHtml(s)}</pre>`;
    return;
  }
  // table
  const cols = r.columns && r.columns.length ? r.columns
    : (r.rows[0] ? Object.keys(r.rows[0]) : []);
  const maxRows = 50;
  const shown = r.rows.slice(0, maxRows);
  const thead = `<tr>${cols.map((c) => `<th>${escapeHtml(String(c))}</th>`).join('')}</tr>`;
  const tbody = shown.map((row) => {
    return `<tr>${cols.map((c) => {
      const v = (row as any)[c];
      const cellStr = v == null ? '' : typeof v === 'object' ? safeJson(v) : String(v);
      return `<td>${escapeHtml(cellStr)}</td>`;
    }).join('')}</tr>`;
  }).join('');
  const trunc = r.rows.length > maxRows ? `<div class="nbc-result-trunc">showing ${maxRows} of ${r.rowCount}</div>` : '';
  el.innerHTML = `<div class="nbc-result-table-wrap"><table class="nbc-result-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>${trunc}`;
}

function safeJson(v: unknown): string {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Layout-specific styles
// ---------------------------------------------------------------------------

function injectLayoutStyles(): void {
  if (document.getElementById('nbc-styles')) return;
  const style = document.createElement('style');
  style.id = 'nbc-styles';
  style.textContent = `
.nbc-outer {
  display: flex; align-items: flex-start; gap: 8px;
}
.nbc-leftpane-slot { flex-shrink: 0; }
.nbc-shell {
  flex: 1; min-width: 0;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 12px; padding: 18px;
}
.nbc-toolbar {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
  gap: 8px; flex-wrap: wrap;
}
.nbc-status {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
  display: inline-flex; align-items: center; gap: 8px;
}
.nbc-status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--color-teal);
}
.nbc-status-dot.nbc-stale { background: var(--color-amber); }
.nbc-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.nbc-history-panel { margin-bottom: 12px; }

.nbc-cell { margin-bottom: 14px; position: relative; }
.nbc-cell:last-child { margin-bottom: 0; }
.nbc-row {
  display: grid; grid-template-columns: 20px 48px 1fr; gap: 6px;
}
.nbc-gutter {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding-top: 2px;
}
.nbc-type-label {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; letter-spacing: 0.12em; color: var(--color-text2);
}
.nbc-gutter-var {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 9.5px; color: var(--color-accent);
  writing-mode: initial; text-align: center;
}
.nbc-gutter-sql .nbc-type-label { color: var(--color-accent); }
.nbc-gutter-js .nbc-type-label { color: var(--color-teal); }
.nbc-line { width: 1px; flex: 1; background: var(--color-border); min-height: 12px; }
.nbc-cell.nbc-fresh .nbc-line { background: var(--color-teal); }
.nbc-cell.nbc-stale .nbc-line { background: var(--color-amber); }

.nbc-md-body { padding: 4px 2px; border: 1px dashed transparent; border-radius: 4px; }
.nbc-md-body:focus-within { border-color: var(--color-border); background: var(--color-bg); }
.nbc-md-del {
  position: absolute; top: 4px; right: 4px;
  opacity: 0; transition: opacity 0.15s;
}
.nbc-cell:hover .nbc-md-del { opacity: 0.5; }
.nbc-md-del:hover { opacity: 1 !important; }

.nbc-code-cell {
  background: var(--color-bg); border: 1px solid var(--color-border);
  border-radius: 8px; overflow: hidden;
  transition: border-color 0.15s;
}
.nbc-code-cell:focus-within { border-color: var(--color-border2); }
.nbc-title-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-bottom: 1px solid var(--color-border);
  background: var(--color-surface2);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10.5px; color: var(--color-text2);
}
.nbc-title-row .nbc-arrow-var { color: var(--color-accent); }
.nbc-title-row .nbc-meta-info { margin-right: auto; }
.nbc-code-body { padding: 10px 14px; }
.nbc-hidden { display: none !important; }
.nbc-result-body {
  padding: 10px 14px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 12px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text1);
}
.nbc-result-empty, .nbc-result-chart-hint {
  color: var(--color-text2); font-style: italic; font-size: 11.5px;
}
.nbc-result-error {
  color: var(--color-accent2); white-space: pre-wrap; font-size: 12px;
}
.nbc-result-pre {
  margin: 4px 0 0; padding: 8px 10px; background: var(--color-surface2);
  border-radius: 4px; font-size: 11.5px; overflow: auto;
  max-height: 260px;
}
.nbc-result-table-wrap { overflow: auto; max-height: 320px; }
.nbc-result-table {
  border-collapse: collapse; width: 100%; font-size: 11.5px;
}
.nbc-result-table th, .nbc-result-table td {
  text-align: left; padding: 4px 8px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap; max-width: 320px; overflow: hidden; text-overflow: ellipsis;
}
.nbc-result-table th {
  color: var(--color-text2); font-weight: 500;
  background: var(--color-surface2);
  position: sticky; top: 0;
}
.nbc-result-table td { font-variant-numeric: tabular-nums; }
.nbc-result-trunc {
  padding: 4px 2px; color: var(--color-text2); font-size: 10.5px; font-style: italic;
}
`;
  document.head.appendChild(style);
}
