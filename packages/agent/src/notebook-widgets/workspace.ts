// @ts-nocheck
// ---------------------------------------------------------------------------
// notebook-workspace — dense analyst workspace (hex-like)
// Header bar + sidebar (sources + cells nav) + main cells area.
// ---------------------------------------------------------------------------

import {
  createState, injectStyles, mountRunControls, mountHistoryPanel,
  setupDnD, deleteCellWithConfirm, restoreCellFromSnapshot, addCell,
  autosize, openShareModal, registerHistoryObserver,
  registerExecutor, addImportedCells,
  collectDataServers, startRun, renderCellLogs,
  createPublishControls, autoConnectFrontmatterServers,
  type NotebookState, type NotebookCell, type CellResult,
} from './shared.js';
import { renderChart } from './chart-renderer.js';
import { dispatchShare } from './share-handlers.js';
import { openAddMdModal, openAddRecipeModal } from './import-modals.js';
import { extractCellsFromRecipe, extractCellFromMarkdown } from './resource-extractor.js';
import { mountLeftPane } from './left-pane.js';
import { callToolViaPostMessage } from '@webmcp-auto-ui/core';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  injectStyles();
  injectLayoutStyles();

  const state: NotebookState = createState({
    id: data.id as string,
    title: data.title as string ?? 'Untitled notebook',
    mode: (data.mode as any) ?? 'edit',
    cells: data.cells as any,
  });

  // Auto-connect frontmatter servers
  autoConnectFrontmatterServers(data, () => rerender());

  // Restore persisted title
  try {
    const saved = localStorage.getItem((state.id || 'nb') + ':title');
    if (saved) state.title = saved;
  } catch {}

  // ---- Register executors (JS + SQL) ---------------------------------------
  registerExecutor(state, 'js', async (ctx) => {
    const started = Date.now();
    try {
      const scope = ctx.scope || {};
      const keys = Object.keys(scope);
      const vals = keys.map((k) => scope[k]);
      // eslint-disable-next-line no-new-func
      const fn = new Function(...keys, `"use strict";\nreturn (async () => { ${ctx.cell.content} })();`);
      const out = await fn(...vals);
      const durationMs = Date.now() - started;
      if (out == null) return { ok: true, kind: 'empty', durationMs };
      if (Array.isArray(out) && out.length && typeof out[0] === 'object') {
        const columns = Array.from(new Set(out.flatMap((r: any) => Object.keys(r || {}))));
        return { ok: true, kind: 'table', rows: out, columns, rowCount: out.length, durationMs };
      }
      return { ok: true, kind: 'value', value: out, durationMs };
    } catch (err: any) {
      return { ok: false, error: String(err?.message ?? err), errorKind: 'runtime', durationMs: Date.now() - started };
    }
  });

  registerExecutor(state, 'sql', async (ctx) => {
    const started = Date.now();
    try {
      const servers = collectDataServers(data);
      let toolName: string | null = null;
      for (const s of servers) {
        const tools = s.tools || [];
        let found = tools.find((t: any) => /.*query_sql$/i.test(t.name || ''));
        if (!found) found = tools.find((t: any) => /^(query|run|execute)(_sql)?$/i.test(t.name || ''));
        if (found) { toolName = found.name; break; }
      }
      if (!toolName) {
        return { ok: false, error: 'No SQL tool found on connected servers', errorKind: 'schema', durationMs: Date.now() - started };
      }
      const res: any = await callToolViaPostMessage(toolName, { sql: ctx.cell.content });
      const durationMs = Date.now() - started;
      // Try to parse a result
      let payload = res;
      if (res && Array.isArray(res.content)) {
        const textBlock = res.content.find((b: any) => b?.type === 'text');
        if (textBlock?.text) {
          try { payload = JSON.parse(textBlock.text); } catch { payload = textBlock.text; }
        }
      }
      let rows: any[] = [];
      if (Array.isArray(payload)) rows = payload;
      else if (payload && Array.isArray(payload.rows)) rows = payload.rows;
      else if (payload && Array.isArray(payload.results)) rows = payload.results;
      if (!Array.isArray(rows) || rows.length === 0) {
        return { ok: true, kind: 'empty', durationMs };
      }
      const columns = Array.from(new Set(rows.flatMap((r: any) => Object.keys(r || {}))));
      return { ok: true, kind: 'table', rows, columns, rowCount: rows.length, durationMs };
    } catch (err: any) {
      return { ok: false, error: String(err?.message ?? err), errorKind: 'runtime', durationMs: Date.now() - started };
    }
  });

  let activeCellId: string | null = state.cells.find((c) => c.type !== 'md')?.id ?? state.cells[0]?.id ?? null;
  const activeCellIdx = () => {
    const i = state.cells.findIndex((c) => c.id === activeCellId);
    return i < 0 ? state.cells.length : i + 1;
  };

  container.classList.add('nb-root');
  container.classList.toggle('nb-view-mode', state.mode === 'view');

  const firstServer = collectDataServers(data)[0];
  const sourceLabel = firstServer?.name ?? 'no source connected';

  container.innerHTML = `
    <div class="nbw-shell">
      <div class="nbw-header">
        <div class="nbw-logo"></div>
        <input class="nbw-title-edit nb-title-edit" value="${escapeAttr(state.title)}">
        <span class="nbw-publish-badge-slot"></span>
        <div class="nbw-ctx">
          <span class="nbw-source">${escapeAttr(sourceLabel)}</span>
          <div class="nb-mode-switch">
            <button class="nb-mode-edit nb-on">edit</button>
            <button class="nb-mode-view">view</button>
          </div>
          <button class="nb-btn nbw-history-btn">⟲ history</button>
          <button class="nb-btn nbw-runall-btn">run all</button>
          <button class="nb-btn nbw-share-btn">share</button>
          <span class="nbw-publish-btn-slot"></span>
        </div>
      </div>
      <div class="nb-history-panel nbw-history-panel"></div>
      <div class="nbw-toast-slot"></div>
      <div class="nbw-body">
        <aside class="nbw-sidebar">
          <div class="nbw-section">sources</div>
          <div class="nbw-sources-list"></div>
          <div class="nbw-section">cells</div>
          <div class="nbw-cells-nav"></div>
          <div class="nbw-add">
            <button class="nb-btn nb-add-cell" data-add="md">+ md</button>
            <button class="nb-btn nb-add-cell" data-add="sql">+ sql</button>
            <button class="nb-btn nb-add-cell" data-add="js">+ js</button>
            <button class="nb-btn nbw-import-md">+md</button>
            <button class="nb-btn nbw-import-recipe">+recipe</button>
          </div>
        </aside>
        <div class="nbw-cells"></div>
      </div>
      <div class="nbw-publish-footer-slot"></div>
    </div>`;

  const shell = container.querySelector('.nbw-shell') as HTMLElement;
  const cellsEl = shell.querySelector('.nbw-cells') as HTMLElement;
  const navEl = shell.querySelector('.nbw-cells-nav') as HTMLElement;
  const historyPanel = shell.querySelector('.nbw-history-panel') as HTMLElement;
  const sourcesListEl = shell.querySelector('.nbw-sources-list') as HTMLElement;
  const toastSlot = shell.querySelector('.nbw-toast-slot') as HTMLElement;
  const sourceEl = shell.querySelector('.nbw-source') as HTMLElement;

  function rerenderSources() {
    const servers = collectDataServers(data);
    sourcesListEl.innerHTML = '';
    if (servers.length === 0) {
      const none = document.createElement('div');
      none.className = 'nbw-item nbw-dim';
      none.textContent = '◯ no source';
      sourcesListEl.appendChild(none);
    } else {
      servers.forEach((srv: any) => {
        const row = document.createElement('div');
        row.className = 'nbw-sources-srv';
        const dot = document.createElement('span');
        dot.className = 'nbw-sources-srv-dot';
        const name = document.createElement('span');
        name.className = 'nbw-sources-srv-name';
        name.textContent = srv.name;
        const meta = document.createElement('span');
        meta.className = 'nbw-sources-srv-meta';
        const recipesN = Array.isArray(srv.recipes) ? srv.recipes.length : 0;
        const toolsN = Array.isArray(srv.tools) ? srv.tools.length : 0;
        meta.textContent = `(${recipesN} recipes, ${toolsN} tools)`;
        name.addEventListener('click', () => {
          // Data server management is handled in the flex sidebar now.
        });
        row.appendChild(dot);
        row.appendChild(name);
        row.appendChild(meta);
        sourcesListEl.appendChild(row);
      });
    }
    const hint = document.createElement('div');
    hint.className = 'nbw-item nbw-indent nbw-dim';
    hint.textContent = 'manage data servers in the sidebar';
    sourcesListEl.appendChild(hint);
  }

  // Back-compat alias — rerender() still calls renderSources
  const renderSources = rerenderSources;

  function scrollToActive() {
    if (!activeCellId) return;
    const node = cellsEl.querySelector(`.nbw-cell[data-id="${activeCellId}"]`) as HTMLElement | null;
    if (!node) return;
    try { node.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
    const ta = node.querySelector('textarea') as HTMLTextAreaElement | null;
    if (ta) setTimeout(() => { try { ta.focus(); } catch {} }, 250);
  }

  function renderCells() {
    cellsEl.innerHTML = '';
    navEl.innerHTML = '';
    state.cells.forEach((cell, idx) => {
      const navItem = document.createElement('div');
      navItem.className = 'nbw-item' + (cell.id === activeCellId ? ' nbw-active' : '');
      navItem.textContent = `${idx + 1} · ${cell.name || cell.type}`;
      navItem.addEventListener('click', () => {
        activeCellId = cell.id;
        rerender();
        scrollToActive();
      });
      navEl.appendChild(navItem);

      cellsEl.appendChild(renderCell(cell, idx, state, rerender));
    });
  }

  function rerender() {
    mountHistoryPanel(historyPanel, state, (snap) => { restoreCellFromSnapshot(state, snap); rerender(); });
    renderCells();
    renderSources();
    // Update source label
    const first = collectDataServers(data)[0];
    sourceEl.textContent = first?.name ?? 'no source connected';
  }

  // Toast helper
  function showToast(msg: string, href?: string): void {
    const t = document.createElement('div');
    t.className = 'nbw-toast';
    if (href) {
      t.innerHTML = `${escapeAttr(msg)} — <a href="${escapeAttr(href)}" target="_blank" rel="noopener">${escapeAttr(href)}</a>`;
    } else {
      t.textContent = msg;
    }
    toastSlot.appendChild(t);
    setTimeout(() => { t.classList.add('nbw-toast-out'); }, 3500);
    setTimeout(() => { try { t.remove(); } catch {} }, 4200);
  }

  // ---- Add-cell buttons -----------------------------------------------------
  shell.querySelectorAll<HTMLElement>('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.add as any;
      const name = type === 'md' ? 'note' : type === 'sql' ? 'query_' + (state.cells.length + 1) : 'cell_' + (state.cells.length + 1);
      const cell = addCell(state, type, { name });
      activeCellId = cell.id;
      rerender();
    });
  });

  // ---- Import buttons (md / recipe) ----------------------------------------
  (shell.querySelector('.nbw-import-md') as HTMLElement).addEventListener('click', () => {
    openAddMdModal((content: string) => {
      addImportedCells(state, [extractCellFromMarkdown(content)], activeCellIdx());
      rerender();
    });
  });
  (shell.querySelector('.nbw-import-recipe') as HTMLElement).addEventListener('click', () => {
    openAddRecipeModal({
      scope: 'data',
      mcpServers: (Array.isArray(data?.servers) ? (data.servers as any[]) : []).map((s: any) => ({ name: s.name, url: s.url })),
      onPick: (recipe: any) => {
        addImportedCells(state, extractCellsFromRecipe(recipe.body ?? '', { title: recipe.name, description: recipe.description }), activeCellIdx());
        rerender();
      },
    });
  });

  // ---- History panel toggle ------------------------------------------------
  (shell.querySelector('.nbw-history-btn') as HTMLElement).addEventListener('click', () => {
    historyPanel.classList.toggle('nb-open');
  });

  // ---- Share button --------------------------------------------------------
  (shell.querySelector('.nbw-share-btn') as HTMLElement).addEventListener('click', () => {
    openShareModal(state, async (fmt) => {
      try {
        await dispatchShare(fmt, state, {
          container,
          onResult: (result: any) => {
            if (result?.shortUrl) showToast('shared', result.shortUrl);
            else if (result?.fullUrl) showToast('shared', result.fullUrl);
            else showToast('exported as ' + fmt);
          },
        });
      } catch (err: any) {
        showToast('share failed: ' + String(err?.message ?? err));
      }
    });
  });

  // ---- Run All -------------------------------------------------------------
  (shell.querySelector('.nbw-runall-btn') as HTMLElement).addEventListener('click', async () => {
    const runnable = state.cells.filter((c) => c.type !== 'md');
    for (const cell of runnable) {
      startRun(cell, state, rerender);
      await waitForCell(cell);
    }
  });

  function waitForCell(cell: NotebookCell): Promise<void> {
    return new Promise((resolve) => {
      const iv = setInterval(() => {
        if (cell.runState !== 'running') {
          clearInterval(iv);
          resolve();
        }
      }, 100);
      // Safety timeout (60s)
      setTimeout(() => { clearInterval(iv); resolve(); }, 60000);
    });
  }

  // ---- Publish controls (shared nb.hyperskills.net) ------------------------
  const destroyPublish = createPublishControls(state, {
    buttonSlot: shell.querySelector('.nbw-publish-btn-slot') as HTMLElement,
    badgeSlot: shell.querySelector('.nbw-publish-badge-slot') as HTMLElement,
    footerSlot: shell.querySelector('.nbw-publish-footer-slot') as HTMLElement,
    toast: (msg: string) => showToast(msg),
  });

  // ---- Title edit (persisted with debounce) --------------------------------
  const titleInput = shell.querySelector('.nbw-title-edit') as HTMLInputElement;
  let titleTimer: any = null;
  titleInput.addEventListener('input', (e) => {
    const v = (e.target as HTMLInputElement).value;
    state.title = v;
    if (titleTimer) clearTimeout(titleTimer);
    titleTimer = setTimeout(() => {
      try { localStorage.setItem((state.id || 'nb') + ':title', v); } catch {}
    }, 300);
  });

  // ---- Mode switch ---------------------------------------------------------
  const editBtn = shell.querySelector('.nb-mode-edit') as HTMLElement;
  const viewBtn = shell.querySelector('.nb-mode-view') as HTMLElement;
  editBtn.addEventListener('click', () => {
    state.mode = 'edit';
    container.classList.remove('nb-view-mode');
    editBtn.classList.add('nb-on'); viewBtn.classList.remove('nb-on');
  });
  viewBtn.addEventListener('click', () => {
    state.mode = 'view';
    container.classList.add('nb-view-mode');
    viewBtn.classList.add('nb-on'); editBtn.classList.remove('nb-on');
  });

  // ---- Left pane (collapsed by default) ------------------------------------
  let leftPaneHandle: any = null;
  try {
    leftPaneHandle = mountLeftPane(shell, state, collectDataServers(data), {
      onInjectCells: (cells: NotebookCell[]) => {
        addImportedCells(state, cells, activeCellIdx());
        rerender();
      },
    });
  } catch (err) {
    // Left pane mount is non-critical; log and continue
    console.warn('[notebook-workspace] left pane mount failed', err);
  }

  // ---- DnD + history observer ---------------------------------------------
  setupDnD(cellsEl, state, rerender);
  const unsubHistory = registerHistoryObserver(() => mountHistoryPanel(historyPanel, state, (snap) => { restoreCellFromSnapshot(state, snap); rerender(); }));

  // ---- Canvas subscribe for sources sidebar live updates -------------------
  let canvasUnsub: (() => void) | null = null;
  try {
    const canvasAny: any = (globalThis as any).__canvasVanilla || (globalThis as any).canvasVanilla;
    if (canvasAny?.subscribe) canvasUnsub = canvasAny.subscribe(() => rerenderSources());
  } catch {}

  rerender();
  return () => {
    unsubHistory();
    try { leftPaneHandle?.destroy?.(); } catch {}
    try { canvasUnsub?.(); } catch {}
    try { destroyPublish(); } catch {}
  };
}

function renderCell(cell: NotebookCell, idx: number, state: NotebookState, rerender: () => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'nb-cell-wrapper nbw-cell';
  wrap.dataset.id = cell.id;

  const inner = document.createElement('div');
  inner.className = 'nb-cell';

  const head = document.createElement('div');
  head.className = 'nbw-cell-head';
  const isCode = cell.type !== 'md';

  // Compute meta info from lastResult
  const metaInfo = computeMetaInfo(cell);

  head.innerHTML = `
    <span class="nb-drag-handle" draggable="true" title="drag">⋮⋮</span>
    ${isCode ? '<span class="nbw-run-controls"></span>' : ''}
    <span class="nbw-type nbw-type-${cell.type}">${cell.type}</span>
    <input class="nbw-cell-name-edit" value="${idx + 1} · ${escapeAttr(cell.name || '')}">
    <div class="nbw-meta">
      ${isCode ? `<span class="nbw-meta-info">${escapeAttr(metaInfo)}</span>` : ''}
      <button class="nb-icon-btn nb-toggle-src">${cell.hideSource ? '▸ src' : '◂ src'}</button>
      ${isCode ? `<button class="nb-icon-btn nb-toggle-res">${cell.hideResult ? '▸ res' : '◂ res'}</button>` : ''}
      <button class="nb-icon-btn nb-danger nbw-del">✕</button>
    </div>`;
  inner.appendChild(head);

  if (isCode) {
    mountRunControls(head.querySelector('.nbw-run-controls') as HTMLElement, cell, wrap, state, rerender);
  }

  const body = document.createElement('div');
  body.className = 'nbw-cell-body' + (isCode ? ' nbw-code' : '') + (cell.hideSource ? ' nbw-hidden' : '');
  const ta = document.createElement('textarea');
  ta.className = isCode ? 'nb-code-edit' : 'nb-md-edit';
  ta.value = cell.content;
  ta.rows = 1;
  ta.spellcheck = false;
  ta.addEventListener('input', () => { cell.content = ta.value; autosize(ta); cell.status = 'stale'; });
  body.appendChild(ta);
  inner.appendChild(body);
  setTimeout(() => autosize(ta), 0);

  // ---- Result rendering (from cell.lastResult) ----
  if (isCode && !cell.hideResult && cell.lastResult) {
    inner.appendChild(renderResult(cell.lastResult));
  }

  (head.querySelector('.nb-toggle-src') as HTMLElement).addEventListener('click', () => { cell.hideSource = !cell.hideSource; rerender(); });
  const togRes = head.querySelector('.nb-toggle-res') as HTMLElement | null;
  if (togRes) togRes.addEventListener('click', () => { cell.hideResult = !cell.hideResult; rerender(); });
  (head.querySelector('.nbw-del') as HTMLElement).addEventListener('click', () =>
    deleteCellWithConfirm(state, cell, (c) => `${c.type} cell "${c.name}"`, rerender)
  );
  (head.querySelector('.nbw-cell-name-edit') as HTMLInputElement).addEventListener('input', (e) => {
    const v = (e.target as HTMLInputElement).value;
    const m = v.match(/^\d+\s*·\s*(.+)$/);
    cell.name = m ? m[1] : v;
  });

  wrap.appendChild(inner);
  return wrap;
}

function computeMetaInfo(cell: NotebookCell): string {
  const ms = cell.lastMs != null ? cell.lastMs + 'ms' : '—';
  const r = cell.lastResult;
  if (!r) return ms + ' · (not run yet)';
  if (!r.ok) return ms + ' · error';
  if (r.kind === 'table') return ms + ' · ' + r.rowCount + ' rows';
  if (r.kind === 'value') return ms + ' · value';
  if (r.kind === 'chart') return ms + ' · chart';
  return ms + ' · empty';
}

function renderResult(res: CellResult): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'nbw-result';
  const logsEl = renderCellLogs(res);
  if (logsEl) wrap.appendChild(logsEl);
  if (!res.ok) {
    const err = document.createElement('div');
    err.className = 'nbw-error';
    err.textContent = '⚠ ' + (res.error || 'error');
    wrap.appendChild(err);
    return wrap;
  }
  if (res.kind === 'empty') {
    const empty = document.createElement('div');
    empty.className = 'nbw-empty';
    empty.textContent = '(empty result)';
    wrap.appendChild(empty);
    return wrap;
  }
  if (res.kind === 'value') {
    const txt = typeof res.value === 'object' ? JSON.stringify(res.value, null, 2) : String(res.value);
    const pre = document.createElement('pre');
    pre.className = 'nbw-value';
    pre.textContent = txt;
    wrap.appendChild(pre);
    return wrap;
  }
  if (res.kind === 'chart') {
    const chart = document.createElement('div');
    chart.className = 'nb-chart';
    wrap.appendChild(chart);
    renderChart(chart, res.spec).catch(() => { /* fallback handled internally */ });
    return wrap;
  }
  // table — use appendChild so we don't wipe the logs panel
  const cols = res.columns;
  const rows = res.rows.slice(0, 100);
  const thead = cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
  const tbody = rows.map((r) => {
    return '<tr>' + cols.map((c) => `<td>${escapeHtml(formatCell((r as any)[c]))}</td>`).join('') + '</tr>';
  }).join('');
  const tableHost = document.createElement('div');
  tableHost.innerHTML = `<table class="nbw-result-table"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
  wrap.appendChild(tableHost.firstElementChild!);
  if (res.rows.length > rows.length) {
    const note = document.createElement('div');
    note.className = 'nbw-empty';
    note.textContent = `… ${res.rows.length - rows.length} more rows`;
    wrap.appendChild(note);
  }
  return wrap;
}

function formatCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function escapeHtml(s: string): string {
  return (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
}

function escapeAttr(s: string): string {
  return (s ?? '').replace(/"/g, '&quot;');
}

function injectLayoutStyles(): void {
  if (document.getElementById('nbw-styles')) return;
  const style = document.createElement('style');
  style.id = 'nbw-styles';
  style.textContent = `
.nbw-shell {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 12px; overflow: hidden; position: relative;
}
.nbw-header {
  display: flex; align-items: center; padding: 10px 14px; gap: 12px;
  border-bottom: 1px solid var(--color-border); background: var(--color-surface2);
}
.nbw-logo { width: 14px; height: 14px; background: var(--color-accent); border-radius: 3px; }
.nbw-title-edit {
  font-size: 13px; font-weight: 500; color: var(--color-text1);
  background: transparent; border: none; outline: none;
  font-family: var(--font-sans, 'Syne', sans-serif);
  width: 260px; padding: 2px 4px; border-radius: 3px;
}
.nbw-title-edit:focus { background: var(--color-bg); }
.nbw-ctx {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
  margin-left: auto; display: flex; gap: 8px; align-items: center;
}
.nbw-history-panel { margin: 0 14px; }
.nbw-body { display: grid; grid-template-columns: 180px 1fr; min-height: 380px; }
.nbw-sidebar {
  border-right: 1px solid var(--color-border);
  background: var(--color-surface2); padding: 14px 12px; font-size: 12px;
}
.nbw-section {
  color: var(--color-text2);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; letter-spacing: 0.1em;
  margin: 0 0 8px; text-transform: uppercase;
}
.nbw-section:not(:first-child) { margin-top: 16px; }
.nbw-item {
  padding: 4px 6px; color: var(--color-text2);
  border-radius: 4px; cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  background: transparent; border: none;
  font: inherit; text-align: left; width: 100%;
}
.nbw-item:hover { background: var(--color-surface); color: var(--color-text1); }
.nbw-item.nbw-indent { padding-left: 18px; }
.nbw-item.nbw-dim { opacity: 0.5; }
.nbw-item.nbw-active {
  background: var(--color-surface); color: var(--color-text1);
  border-left: 2px solid var(--color-accent); border-radius: 0 4px 4px 0;
}
.nbw-connect-btn { cursor: pointer; }
.nbw-connect-btn:hover { opacity: 1; }
.nbw-sources-srv { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 12px; }
.nbw-sources-srv-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-accent); }
.nbw-sources-srv-name { font-weight: 600; color: var(--color-text1); cursor: pointer; }
.nbw-sources-srv-name:hover { color: var(--color-accent); }
.nbw-sources-srv-meta { color: var(--color-text2); font-family: var(--font-mono, monospace); font-size: 10.5px; margin-left: auto; }
.nbw-add { margin-top: 10px; display: flex; gap: 4px; flex-wrap: wrap; }
.nbw-add .nb-btn { flex: 1 1 auto; font-size: 10px; padding: 3px 4px; }

.nbw-cells { display: flex; flex-direction: column; }
.nbw-cell .nb-cell { border-bottom: 1px solid var(--color-border); position: relative; }
.nbw-cell:last-child .nb-cell { border-bottom: none; }
.nbw-cell-head {
  padding: 8px 16px;
  display: flex; align-items: center; gap: 8px;
  background: var(--color-surface2);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; color: var(--color-text2);
  letter-spacing: 0.06em;
}
.nbw-type {
  padding: 1px 7px; border-radius: 3px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.08em; font-size: 9.5px;
}
.nbw-type-md { background: rgba(160,160,184,0.15); color: var(--color-text2); }
.nbw-type-sql { background: rgba(124,109,250,0.18); color: var(--color-accent); }
.nbw-type-js { background: rgba(62,207,178,0.15); color: var(--color-teal); }
.nbw-cell-name-edit {
  background: transparent; border: none; outline: none;
  color: var(--color-text1);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; width: 140px;
}
.nbw-meta { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.nbw-cell-body { padding: 14px 16px; font-size: 13.5px; line-height: 1.6; }
.nbw-cell-body.nbw-code {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 12.5px; line-height: 1.65;
}
.nbw-hidden { display: none !important; }

.nbw-result { border-top: 1px dashed var(--color-border); }
.nbw-result-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.nbw-result-table thead tr { background: var(--color-surface2); }
.nbw-result-table th {
  text-align: left; padding: 7px 16px; font-weight: 500;
  color: var(--color-text2);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}
.nbw-result-table td {
  padding: 6px 16px; border-bottom: 1px solid var(--color-border);
  font-variant-numeric: tabular-nums;
}
.nbw-result-table td:first-child { color: var(--color-text1); font-variant-numeric: normal; }
.nbw-share-bar { height: 8px; background: var(--color-accent); border-radius: 2px; }

.nbw-value {
  margin: 0; padding: 12px 16px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 12px; color: var(--color-text1);
  background: var(--color-bg); white-space: pre-wrap; word-break: break-word;
}
.nbw-empty {
  padding: 12px 16px; color: var(--color-text2);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace); font-size: 11px;
  font-style: italic;
}
.nbw-error {
  padding: 10px 16px; color: #d66; background: rgba(220,80,80,0.08);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace); font-size: 12px;
  border-top: 1px solid rgba(220,80,80,0.3);
}

.nbw-toast-slot {
  position: absolute; bottom: 14px; right: 14px; z-index: 50;
  display: flex; flex-direction: column; gap: 6px; pointer-events: none;
}
.nbw-toast {
  background: var(--color-surface2); color: var(--color-text1);
  border: 1px solid var(--color-border); border-radius: 6px;
  padding: 8px 12px; font-size: 11.5px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  pointer-events: auto; max-width: 420px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  transition: opacity 0.4s, transform 0.4s;
}
.nbw-toast a { color: var(--color-accent); text-decoration: underline; }
.nbw-toast-out { opacity: 0; transform: translateY(6px); }
`;
  document.head.appendChild(style);
}
