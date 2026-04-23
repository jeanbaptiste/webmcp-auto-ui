// @ts-nocheck
// ---------------------------------------------------------------------------
// notebook — publication-ready layout (observable-like)
// Serif prose + cells in a single ordered list, all drag-and-droppable together.
// Cells alternate freely: md (prose paragraph) / sql / js cells share the flow.
// ---------------------------------------------------------------------------

import {
  createState, injectStyles, mountRunControls, mountHistoryPanel,
  setupDnD, deleteCellWithConfirm, restoreCellFromSnapshot, addCell,
  addImportedCells, registerExecutor, collectDataServers,
  autosize, openShareModal, registerHistoryObserver,
  renderCellLogs,
  createPublishControls, autoConnectFrontmatterServers,
  createRuntimeOverlay, effectiveResult, cellRuntimeStatus,
  lastRefreshedAt, bootstrapLiveRefresh, fmtRelTime, preserveScrollAround,
  type NotebookState, type NotebookCell, type CellResult, type CellExecContext,
  type RuntimeOverlay,
} from './shared.js';
import { renderChart } from './chart-renderer.js';
import { dispatchShare } from './share-handlers.js';
import { renderProse, mountEditableProse } from './prose.js';
import { openAddMdModal, openAddRecipeModal } from './import-modals.js';
import { extractCellsFromRecipe, extractCellFromMarkdown } from './resource-extractor.js';
import { mountLeftPane } from './left-pane.js';
import { highlightCode } from '../../primitives/markdown-renderer.js';
import { callToolViaPostMessage, MultiMcpBridge } from '@webmcp-auto-ui/core';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  injectStyles();
  injectLayoutStyles();

  const state: NotebookState = createState({
    id: data.id as string,
    title: data.title as string ?? 'Untitled notebook',
    mode: (data.mode as any) ?? 'edit',
    cells: data.cells as any,
    kicker: (data.kicker as string) ?? undefined,
    autoRun: (data as any).autoRun === true,
  });
  if (!state.kicker) state.kicker = (data.kicker as string) ?? 'untitled';

  // Live mode runtime overlay (created lazily). Never mutates state.
  let overlay: RuntimeOverlay | null = null;
  let liveCleanup: (() => void) | null = null;

  // --- register executors -------------------------------------------------
  registerExecutor(state, 'js', jsExecutor);
  registerExecutor(state, 'sql', makeSqlExecutor(data));

  container.classList.add('nb-root');
  container.classList.toggle('nb-view-mode', state.mode === 'view');

  container.innerHTML = `
    <div class="nbe-outer">
      <div class="nbe-leftpane-slot"></div>
      <div class="nbe-shell">
        <div class="nbe-kicker">
          <input class="nbe-kicker-input" value="${escapeAttr(state.kicker || '')}" placeholder="kicker…">
          <span class="nbe-live-toggle-slot"></span>
          <div class="nb-mode-switch" style="margin-left:auto;">
            <button class="nb-mode-edit nb-on">edit</button>
            <button class="nb-mode-view">view</button>
          </div>
          <button class="nb-btn nbe-history-btn">⟲ history</button>
          <span class="nbe-publish-badge-slot"></span>
        </div>
        <div class="nbe-title-row">
          <input class="nbe-title nb-ed-title" value="${escapeAttr(state.title)}">
          <span class="nbe-live-badge-slot"></span>
        </div>
        <div class="nbe-empty-state-slot"></div>
        <div class="nb-history-panel nbe-history-panel"></div>
        <div class="nbe-cells"></div>
        <div class="nbe-footer">
          <button class="nb-btn nb-add-cell" data-add="md">+ prose</button>
          <button class="nb-btn nb-add-cell" data-add="sql">+ sql</button>
          <button class="nb-btn nb-add-cell" data-add="js">+ chart</button>
          <button class="nb-btn nb-add-cell" data-add-modal="md">+ md</button>
          <button class="nb-btn nb-add-cell" data-add-modal="recipe">+ recipe</button>
          <span class="nbe-share-btn" title="Share">share</span>
          <span class="nbe-publish-slot"></span>
        </div>
        <div class="nbe-publish-footer-slot"></div>
      </div>
    </div>`;

  const shell = container.querySelector('.nbe-shell') as HTMLElement;
  const leftPaneHost = container.querySelector('.nbe-leftpane-slot') as HTMLElement;
  const cellsEl = shell.querySelector('.nbe-cells') as HTMLElement;
  const historyPanel = shell.querySelector('.nbe-history-panel') as HTMLElement;

  let lastActiveIdx: number | null = null;
  function activeCellIdx(): number | null {
    if (lastActiveIdx != null && lastActiveIdx >= 0 && lastActiveIdx < state.cells.length) {
      return lastActiveIdx;
    }
    return null;
  }

  function renderCells() {
    cellsEl.innerHTML = '';
    state.cells.forEach((cell, idx) => {
      const node = renderCell(cell, state, overlay, rerender);
      node.addEventListener('focusin', () => { lastActiveIdx = idx; });
      cellsEl.appendChild(node);
    });
  }

  const hideLiveToggle = (data as any).hideLiveToggle === true;

  function renderLiveToggle() {
    const slot = shell.querySelector('.nbe-live-toggle-slot') as HTMLElement;
    if (hideLiveToggle) { slot.innerHTML = ''; return; }
    if (state.mode === 'edit') {
      const checked = state.autoRun === true ? 'checked' : '';
      slot.innerHTML = `<label class="nbe-live-toggle" title="Re-execute SQL cells against connected servers when this notebook is opened in view mode."><input type="checkbox" ${checked} />Live data</label>`;
      const cb = slot.querySelector('input[type=checkbox]') as HTMLInputElement;
      cb.addEventListener('change', () => {
        state.autoRun = cb.checked;
        rerender();
      });
    } else {
      slot.innerHTML = '';
    }
  }

  function renderLiveBadge() {
    const slot = shell.querySelector('.nbe-live-badge-slot') as HTMLElement;
    if (state.mode === 'view' && state.autoRun === true) {
      const refreshedAt = lastRefreshedAt(overlay);
      const refreshedTxt = refreshedAt
        ? `Refreshed ${escapeHtml(fmtRelTime(refreshedAt))} ago`
        : (overlay?.startedAt && !overlay?.finishedAt ? 'Refreshing…' : '');
      slot.innerHTML = `<span class="nb-live-badge">● Live</span>${refreshedTxt ? `<span class="nbe-refreshed-at">${refreshedTxt}</span>` : ''}`;
    } else {
      slot.innerHTML = '';
    }
  }

  function renderEmptyState() {
    const slot = shell.querySelector('.nbe-empty-state-slot') as HTMLElement;
    const showBanner = state.autoRun === true && state.mode === 'view' && overlay
      && (overlay.error || (overlay.finishedAt !== null && overlay.outputs.size === 0));
    if (!showBanner) {
      slot.innerHTML = '';
      return;
    }
    const snapTs = state.lastEditAt ? fmtRelTime(state.lastEditAt) : '—';
    slot.innerHTML = `
      <div class="nb-empty-state">
        <div class="nb-empty-icon">📡</div>
        <div class="nb-empty-body">
          <div class="nb-empty-title">Live mode active, but no data server is reachable.</div>
          <div class="nb-empty-desc">Showing snapshots from <time>${escapeHtml(snapTs)} ago</time>.</div>
        </div>
        <button class="nb-btn nb-empty-retry">retry connection</button>
      </div>
    `;
    (slot.querySelector('.nb-empty-retry') as HTMLElement).addEventListener('click', () => {
      bootstrapLive();
      rerender();
    });
  }

  function bootstrapLive() {
    liveCleanup?.();
    liveCleanup = null;
    overlay = createRuntimeOverlay();
    liveCleanup = bootstrapLiveRefresh({
      state,
      data,
      overlay,
      MultiMcpBridgeCtor: MultiMcpBridge as any,
      onCellChange: (cellId) => {
        const node = cellsEl.querySelector(`[data-id="${cellId}"]`) as HTMLElement | null;
        if (!node) {
          const restore = preserveScrollAround(cellsEl);
          renderCells();
          restore();
          return;
        }
        const idx = state.cells.findIndex((c) => c.id === cellId);
        if (idx < 0) return;
        const restore = preserveScrollAround(cellsEl);
        const fresh = renderCell(state.cells[idx], state, overlay, rerender);
        fresh.addEventListener('focusin', () => { lastActiveIdx = idx; });
        node.replaceWith(fresh);
        restore();
      },
      onTick: () => {
        renderLiveBadge();
        renderEmptyState();
      },
    });
  }

  function rerender() {
    const restore = preserveScrollAround(cellsEl);
    mountHistoryPanel(historyPanel, state, (snap) => { restoreCellFromSnapshot(state, snap); rerender(); });
    renderLiveToggle();
    renderLiveBadge();
    renderEmptyState();
    renderCells();
    restore();
  }

  // Toolbar: direct add (prose/sql/js)
  shell.querySelectorAll<HTMLElement>('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.add as any;
      addCell(state, type);
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
          addImportedCells(state, [cell], activeCellIdx());
          rerender();
        });
      } else if (which === 'recipe') {
        const mcpServers = (Array.isArray((data as any)?.servers) ? (data as any).servers : [])
          .map((s: any) => ({ name: String(s?.name ?? ''), url: s?.url ? String(s.url) : undefined }))
          .filter((s: any) => s.name);
        openAddRecipeModal({
          mcpServers,
          scope: 'data',
          onPick: (recipe) => {
            const cells = extractCellsFromRecipe(recipe.body ?? '', {
              title: recipe.name, description: recipe.description,
            });
            addImportedCells(state, cells, activeCellIdx());
            rerender();
          },
        });
      }
    });
  });

  (shell.querySelector('.nbe-history-btn') as HTMLElement).addEventListener('click', () => {
    historyPanel.classList.toggle('nb-open');
  });
  (shell.querySelector('.nbe-share-btn') as HTMLElement).addEventListener('click', () => {
    openShareModal(state, (fmt) => {
      dispatchShare(fmt, state, {
        container,
        onResult: (info) => toast(container, formatShareToast(info)),
      });
    });
  });
  const publishCleanup = createPublishControls(state, {
    buttonSlot: shell.querySelector('.nbe-publish-slot') as HTMLElement,
    badgeSlot: shell.querySelector('.nbe-publish-badge-slot') as HTMLElement,
    footerSlot: shell.querySelector('.nbe-publish-footer-slot') as HTMLElement,
    onPublished: () => rerender(),
  });
  (shell.querySelector('.nbe-kicker-input') as HTMLInputElement).addEventListener('input', (e) => {
    state.kicker = (e.target as HTMLInputElement).value;
    state.lastEditAt = Date.now();
  });
  (shell.querySelector('.nbe-title') as HTMLInputElement).addEventListener('input', (e) => {
    state.title = (e.target as HTMLInputElement).value;
    state.lastEditAt = Date.now();
  });
  const editBtn = shell.querySelector('.nb-mode-edit') as HTMLElement;
  const viewBtn = shell.querySelector('.nb-mode-view') as HTMLElement;
  editBtn.addEventListener('click', () => {
    state.mode = 'edit';
    container.classList.remove('nb-view-mode');
    editBtn.classList.add('nb-on'); viewBtn.classList.remove('nb-on');
    // Leaving view: stop live refresh and clear overlay so frozen snapshots show.
    liveCleanup?.(); liveCleanup = null; overlay = null;
    rerender();
  });
  viewBtn.addEventListener('click', () => {
    state.mode = 'view';
    container.classList.add('nb-view-mode');
    viewBtn.classList.add('nb-on'); editBtn.classList.remove('nb-on');
    if (state.autoRun === true) bootstrapLive();
    rerender();
  });

  // Left pane (collapsed by default)
  const pane = mountLeftPane(leftPaneHost, state, collectDataServers(data), {
    onInjectCells: (cells) => {
      addImportedCells(state, cells, activeCellIdx());
      rerender();
    },
  });

  // Auto-connect data servers declared in the recipe frontmatter (data.servers).
  // The notebook reads MCP state passively from globalThis.__multiMcp (singleton).
  autoConnectFrontmatterServers(data, () => pane.setServers(collectDataServers(data)));

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

  // Mount-time bootstrap: view + autoRun → start live refresh.
  if (state.autoRun === true && state.mode === 'view') {
    bootstrapLive();
    rerender();
  }

  return () => {
    unsubHistory();
    canvasUnsub?.();
    pane.destroy();
    publishCleanup();
    liveCleanup?.();
  };
}

// ---------------------------------------------------------------------------
// Executors (same pattern as compact/workspace/document agents)
// ---------------------------------------------------------------------------

async function jsExecutor(ctx: CellExecContext): Promise<CellResult> {
  const start = Date.now();
  const { cell, scope } = ctx;
  try {
    const keys = Object.keys(scope);
    const values = keys.map((k) => scope[k]);
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
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* not JSON */ }
      if (parsed) {
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
// Cell rendering — prose + code share the unified flow, same DnD handle
// ---------------------------------------------------------------------------

function renderCell(cell: NotebookCell, state: NotebookState, overlay: RuntimeOverlay | null, rerender: () => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'nb-cell-wrapper nbe-cell';
  wrap.dataset.id = cell.id;

  const handle = document.createElement('span');
  handle.className = 'nb-drag-handle nbe-handle';
  handle.draggable = true;
  handle.textContent = '⋮⋮';
  wrap.appendChild(handle);

  const del = document.createElement('button');
  del.className = 'nb-icon-btn nb-danger nbe-del-abs';
  del.textContent = '✕';
  del.addEventListener('click', () =>
    deleteCellWithConfirm(state, cell, (c) => c.type === 'md' ? 'prose paragraph' : `${c.type} cell`, rerender)
  );
  wrap.appendChild(del);

  if (cell.type === 'md') {
    if (state.mode === 'view') {
      const rendered = document.createElement('div');
      rendered.className = 'nbe-prose nbe-prose-render';
      rendered.innerHTML = renderProse(cell.content || '');
      wrap.appendChild(rendered);
    } else {
      // Inline WYSIWYG — single contenteditable zone, floating toolbar on select.
      const editor = mountEditableProse({
        getContent: () => cell.content || '',
        setContent: (md) => { cell.content = md; },
        onChange: () => { state.lastEditAt = Date.now(); },
      });
      wrap.appendChild(editor.el);
    }
    return wrap;
  }

  // Code cell: header with run controls FIRST, then code body, then optional output.
  const codeCell = document.createElement('div');
  codeCell.className = 'nb-code-cell nbe-code-cell';

  const head = document.createElement('div');
  head.className = 'nbe-cell-head';
  const rtStatus = cellRuntimeStatus(cell, overlay);
  const showLive = state.autoRun === true && state.mode === 'view';
  let liveBadge = '';
  if (showLive) {
    if (rtStatus === 'running') {
      liveBadge = `<span class="nbe-cell-badge nbe-cell-running" title="re-executing"><span class="nbe-spinner"></span>running</span>`;
    } else if (rtStatus === 'stale') {
      liveBadge = `<span class="nbe-cell-badge nbe-cell-stale" title="last live refresh failed">stale</span>`;
    } else if (rtStatus === 'frozen') {
      liveBadge = `<span class="nbe-cell-badge nbe-cell-frozen" title="JS cells are not re-executed in live mode">frozen</span>`;
    }
  }
  head.innerHTML = `
    <span class="nbe-run-controls"></span>
    <span class="nbe-type-${cell.type}">${cell.type}</span>
    <span class="nbe-meta-info">${escapeHtml(metaInfoFor(cell, overlay))}</span>
    ${liveBadge}
    <div class="nbe-actions">
      <button class="nb-icon-btn nb-toggle-src">${cell.hideSource ? '▸ src' : '◂ src'}</button>
      <button class="nb-icon-btn nb-toggle-res">${cell.hideResult ? '▸ res' : '◂ res'}</button>
    </div>`;
  codeCell.appendChild(head);
  mountRunControls(head.querySelector('.nbe-run-controls') as HTMLElement, cell, wrap, state, rerender);

  const body = document.createElement('div');
  body.className = 'nbe-code-body' + (cell.hideSource ? ' nbe-hidden' : '');
  if (state.mode === 'view') {
    const lang = cell.type === 'js' ? 'javascript' : cell.type;
    const pre = document.createElement('pre');
    pre.className = 'hljs-pre nb-code-view';
    pre.innerHTML = `<code class="hljs language-${lang}">${highlightCode(cell.content, lang)}</code>`;
    body.appendChild(pre);
  } else {
    const ta = document.createElement('textarea');
    ta.className = 'nb-code-edit';
    ta.value = cell.content;
    ta.rows = 1;
    ta.spellcheck = false;
    ta.addEventListener('input', () => { cell.content = ta.value; autosize(ta); cell.status = 'stale'; });
    body.appendChild(ta);
    requestAnimationFrame(() => requestAnimationFrame(() => autosize(ta)));
  }
  codeCell.appendChild(body);

  if (!cell.hideResult) {
    const res = document.createElement('div');
    res.className = 'nbe-result';
    renderResultInto(res, cell, overlay);
    codeCell.appendChild(res);
  }

  wrap.appendChild(codeCell);

  (head.querySelector('.nb-toggle-src') as HTMLElement).addEventListener('click', () => { cell.hideSource = !cell.hideSource; rerender(); });
  (head.querySelector('.nb-toggle-res') as HTMLElement).addEventListener('click', () => { cell.hideResult = !cell.hideResult; rerender(); });

  return wrap;
}

// ---------------------------------------------------------------------------
// Result rendering — editorial flavour (serif headers, mono cells, discreet)
// ---------------------------------------------------------------------------

function metaInfoFor(cell: NotebookCell, overlay: RuntimeOverlay | null): string {
  const r = effectiveResult(cell, overlay) ?? cell.lastResult;
  if (!r) {
    if (cell.lastMs != null) return formatMs(cell.lastMs);
    return cell.status === 'stale' ? 'stale' : '';
  }
  const parts: string[] = [];
  if (!r.ok) parts.push('error');
  else if (r.kind === 'table') parts.push(`${r.rowCount} row${r.rowCount === 1 ? '' : 's'}`);
  else if (r.kind === 'value') parts.push(typeof r.value === 'object' && r.value !== null ? 'object' : typeof r.value);
  else if (r.kind === 'chart') parts.push('chart');
  else parts.push('empty');
  if (r.durationMs != null) parts.push(formatMs(r.durationMs));
  return parts.join(' · ');
}

function formatMs(ms: number): string {
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(2) + 's';
}

function renderResultInto(el: HTMLElement, cell: NotebookCell, overlay: RuntimeOverlay | null): void {
  const r = effectiveResult(cell, overlay) ?? cell.lastResult;
  el.innerHTML = '';
  if (!r) {
    el.innerHTML = `<div class="nbe-result-empty">press ▶ to run</div>`;
    return;
  }
  // Logs panel (shared across all widgets), prepended above the main result
  const logsEl = renderCellLogs(r);
  if (logsEl) el.appendChild(logsEl);
  if (!r.ok) {
    const err = document.createElement('div');
    err.className = 'nbe-result-error';
    err.textContent = r.error || 'error';
    el.appendChild(err);
    return;
  }
  if (r.kind === 'empty') {
    const empty = document.createElement('div');
    empty.className = 'nbe-result-empty';
    empty.textContent = '(no output)';
    el.appendChild(empty);
    return;
  }
  if (r.kind === 'value') {
    const pre = document.createElement('pre');
    pre.className = 'nbe-result-pre';
    pre.textContent = safeJson(r.value);
    el.appendChild(pre);
    return;
  }
  if (r.kind === 'chart') {
    const chart = document.createElement('div');
    chart.className = 'nb-chart';
    el.appendChild(chart);
    renderChart(chart, r.spec).catch(() => { /* fallback handled internally */ });
    return;
  }
  // table — editorial style: serif header row, mono cells, minimal chrome.
  const cols = r.columns && r.columns.length ? r.columns
    : (r.rows[0] ? Object.keys(r.rows[0]) : []);
  const maxRows = 40;
  const shown = r.rows.slice(0, maxRows);
  const thead = `<tr>${cols.map((c) => `<th>${escapeHtml(String(c))}</th>`).join('')}</tr>`;
  const tbody = shown.map((row) => {
    return `<tr>${cols.map((c) => {
      const v = (row as any)[c];
      const cellStr = v == null ? '' : typeof v === 'object' ? safeJson(v) : String(v);
      return `<td>${escapeHtml(cellStr)}</td>`;
    }).join('')}</tr>`;
  }).join('');
  const trunc = r.rows.length > maxRows
    ? `<div class="nbe-result-trunc">showing ${maxRows} of ${r.rowCount}</div>`
    : '';
  // appendChild so we don't overwrite the logs panel prepended above
  const host = document.createElement('div');
  host.innerHTML = `<div class="nbe-result-table-wrap"><table class="nbe-result-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>${trunc}`;
  while (host.firstChild) el.appendChild(host.firstChild);
}

function safeJson(v: unknown): string {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function toast(container: HTMLElement, msg: string, isError = false): void {
  const t = document.createElement('div');
  t.className = 'nbe-toast' + (isError ? ' nbe-toast-error' : '');
  t.textContent = msg;
  container.appendChild(t);
  requestAnimationFrame(() => t.classList.add('nbe-toast-in'));
  setTimeout(() => {
    t.classList.remove('nbe-toast-in');
    setTimeout(() => t.remove(), 250);
  }, 3200);
}

function formatShareToast(info: any): string {
  if (!info) return 'share ready';
  if (info.kind === 'hyperskill') {
    const url = info.shortUrl || info.fullUrl || '';
    return url ? `hyperskill link copied · ${url.slice(0, 48)}…` : 'hyperskill link ready';
  }
  if (info.kind === 'markdown' || info.kind === 'md') return 'markdown downloaded';
  if (info.kind === 'json') return 'json downloaded';
  if (info.kind === 'png') return 'png downloaded';
  return 'shared';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
}
function escapeAttr(s: string): string {
  return String(s ?? '').replace(/"/g, '&quot;');
}

function injectLayoutStyles(): void {
  if (document.getElementById('nbe-styles')) return;
  const style = document.createElement('style');
  style.id = 'nbe-styles';
  style.textContent = `
.nbe-outer {
  display: flex; align-items: flex-start; gap: 8px;
}
.nbe-leftpane-slot { flex-shrink: 0; }
.nbe-shell {
  flex: 1; min-width: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 36px 44px;
}
.nbe-kicker {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
  letter-spacing: 0.1em; text-transform: uppercase;
  margin-bottom: 14px;
}
.nbe-kicker-input {
  flex: 0 0 auto; min-width: 120px;
  background: transparent; border: 1px dashed transparent;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 2px 4px; border-radius: 3px; outline: none;
}
.nbe-kicker-input:focus { border-color: var(--color-border); background: var(--color-bg); color: var(--color-text1); }
.nb-root.nb-view-mode .nbe-kicker-input { pointer-events: none; }
.nbe-title {
  font-family: var(--font-serif, 'EB Garamond', Georgia, serif);
  font-size: 30px; font-weight: 500;
  margin: 0 0 12px;
  letter-spacing: -0.01em; line-height: 1.2;
  background: transparent; border: none; outline: none;
  color: var(--color-text1);
  width: 100%; padding: 2px 4px; border-radius: 3px;
}
.nbe-title:focus { background: var(--color-bg); }
.nbe-history-panel { margin: 0 0 14px; }

.nbe-cells { display: flex; flex-direction: column; gap: 14px; }
.nbe-cell { position: relative; padding-left: 28px; }
.nbe-handle { position: absolute; left: 0; top: 6px; }
.nbe-del-abs {
  position: absolute; top: 4px; right: 4px;
  opacity: 0; transition: opacity 0.15s;
}
.nbe-cell:hover .nbe-del-abs { opacity: 0.5; }
.nbe-del-abs:hover { opacity: 1 !important; }

.nbe-prose {
  font-family: var(--font-serif, 'EB Garamond', Georgia, serif);
  font-size: 17px; line-height: 1.7;
  color: var(--color-text1);
  max-width: 620px;
  padding: 2px 4px;
  border-radius: 3px;
}
.nbe-prose-render h1, .nbe-prose-render h2, .nbe-prose-render h3,
.nbe-prose-render h4, .nbe-prose-render h5, .nbe-prose-render h6 {
  font-family: var(--font-serif, 'EB Garamond', Georgia, serif);
  font-weight: 600; letter-spacing: -0.01em;
  margin: 0.6em 0 0.3em;
}
.nbe-prose-render h1 { font-size: 1.4em; }
.nbe-prose-render h2 { font-size: 1.25em; }
.nbe-prose-render h3 { font-size: 1.12em; }
.nbe-prose-render p { margin: 0.5em 0; }
.nbe-prose-render ul, .nbe-prose-render ol { margin: 0.5em 0; padding-left: 1.4em; }
.nbe-prose-render blockquote {
  border-left: 3px solid var(--color-border);
  padding-left: 12px; margin: 0.6em 0;
  color: var(--color-text2); font-style: italic;
}
.nbe-prose-render code {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.82em;
  background: var(--color-surface2);
  padding: 1px 6px; border-radius: 3px;
  color: var(--color-accent);
}
.nbe-prose-render mark {
  background: rgba(240,160,80,0.18);
  color: var(--color-amber);
  padding: 0 4px; border-radius: 2px;
}
.nbe-prose-edit {
  display: block; width: 100%; max-width: 620px;
  background: var(--color-bg);
  border: 1px dashed var(--color-border); border-radius: 4px;
  padding: 8px 10px; margin-bottom: 6px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 12.5px; line-height: 1.6;
  color: var(--color-text1);
  outline: none; resize: none; overflow: hidden;
}
.nbe-prose-edit:focus { border-color: var(--color-border2); border-style: solid; }

.nbe-code-cell {
  background: var(--color-surface2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}
.nbe-cell-head {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 12px;
  border-bottom: 1px solid var(--color-border);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; color: var(--color-text2);
  letter-spacing: 0.06em;
}
.nbe-type-sql { color: var(--color-accent); text-transform: uppercase; letter-spacing: 0.08em; }
.nbe-type-js { color: var(--color-teal); text-transform: uppercase; letter-spacing: 0.08em; }
.nbe-meta-info { margin-right: auto; color: var(--color-text2); }
.nbe-actions { display: flex; gap: 4px; }
.nbe-code-body { padding: 14px 16px; }
.nbe-hidden { display: none !important; }

.nbe-result {
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  padding: 12px 16px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 12px; color: var(--color-text1);
}
.nbe-result-empty {
  color: var(--color-text2); font-style: italic; font-size: 11.5px;
}
.nbe-result-error {
  color: var(--color-accent2); white-space: pre-wrap; font-size: 12px;
}
.nbe-result-label {
  font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--color-text2); margin-bottom: 6px;
}
.nbe-result-pre {
  margin: 0; padding: 8px 10px;
  background: var(--color-surface2); border-radius: 4px;
  font-size: 11.5px; overflow: auto; max-height: 260px;
  color: var(--color-text1);
}
.nbe-result-table-wrap { overflow: auto; max-height: 320px; }
.nbe-result-table {
  width: 100%; border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.nbe-result-table thead th {
  font-family: var(--font-serif, 'EB Garamond', Georgia, serif);
  font-size: 12.5px; font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--color-text2);
  text-align: left;
  padding: 6px 10px;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  position: sticky; top: 0;
}
.nbe-result-table tbody td {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11.5px;
  color: var(--color-text1);
  padding: 4px 10px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap; max-width: 320px; overflow: hidden; text-overflow: ellipsis;
}
.nbe-result-table tbody tr:last-child td { border-bottom: none; }
.nbe-result-trunc {
  margin-top: 6px; padding: 4px 2px;
  color: var(--color-text2); font-size: 10.5px; font-style: italic;
}

.nbe-footer {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding-top: 16px; margin-top: 24px;
  border-top: 1px solid var(--color-border);
  align-items: center;
}
.nbe-share-btn {
  margin-left: auto;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
  cursor: pointer;
  padding: 5px 10px;
}
.nbe-share-btn:hover { color: var(--color-accent); }
.nbe-publish-btn {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px;
}
.nbe-publish-btn[data-state="published"] { color: var(--color-accent); }

/* Toast */
.nbe-toast {
  position: fixed; bottom: 24px; left: 50%;
  transform: translateX(-50%) translateY(8px);
  background: var(--color-surface2); color: var(--color-text1);
  border: 1px solid var(--color-border); border-radius: 8px;
  padding: 8px 14px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11.5px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  opacity: 0; transition: opacity 0.25s, transform 0.25s;
  z-index: 1005; pointer-events: none;
  max-width: 480px;
}
.nbe-toast.nbe-toast-in { opacity: 1; transform: translateX(-50%) translateY(0); }
.nbe-toast.nbe-toast-error { color: var(--color-accent2); border-color: var(--color-accent2); }

/* Live mode — discreet toggle in header (edit mode only) */
.nbe-live-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10.5px; color: var(--color-text2);
  letter-spacing: 0.06em; text-transform: uppercase;
  cursor: pointer; user-select: none;
  padding: 2px 7px; border: 1px solid var(--color-border); border-radius: 4px;
}
.nbe-live-toggle:hover { color: var(--color-text1); border-color: var(--color-border2); }
.nbe-live-toggle input { margin: 0; cursor: pointer; }

/* Title row + Live badge (view mode + autoRun) */
.nbe-title-row { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.nbe-title-row .nbe-title { flex: 1; min-width: 0; }
.nbe-live-badge-slot { display: inline-flex; align-items: center; gap: 8px; }
.nbe-refreshed-at {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10.5px; color: var(--color-text2);
}

/* Shared "● Live" pill */
.nb-live-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 7px; border-radius: 999px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; font-weight: 500; letter-spacing: 0.04em;
  background: rgba(46, 160, 67, 0.12);
  color: #2ea043; border: 1px solid rgba(46, 160, 67, 0.35);
}

/* Per-cell live badges (in cell head) */
.nbe-cell-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 1px 6px; border-radius: 999px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 9.5px; letter-spacing: 0.04em;
  border: 1px solid transparent;
  margin-left: 4px;
}
.nbe-cell-running {
  background: rgba(46, 160, 67, 0.10); color: #2ea043;
  border-color: rgba(46, 160, 67, 0.30);
}
.nbe-cell-stale {
  background: rgba(210, 153, 34, 0.12); color: var(--color-amber, #d29922);
  border-color: rgba(210, 153, 34, 0.35);
}
.nbe-cell-frozen {
  background: var(--color-surface2); color: var(--color-text2);
  border-color: var(--color-border);
  opacity: 0.75;
}
.nbe-spinner {
  width: 8px; height: 8px; border-radius: 50%;
  border: 1.5px solid currentColor; border-right-color: transparent;
  display: inline-block; animation: nbe-spin 0.8s linear infinite;
}
@keyframes nbe-spin { to { transform: rotate(360deg); } }

/* Empty-state banner */
.nb-empty-state {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px; margin: 12px 0 14px;
  background: rgba(210, 153, 34, 0.08);
  border: 1px solid rgba(210, 153, 34, 0.40);
  border-radius: 8px;
  color: var(--color-amber, #d29922);
}
.nb-empty-icon { font-size: 22px; line-height: 1; }
.nb-empty-body { flex: 1; min-width: 0; }
.nb-empty-title {
  font-family: var(--font-serif, 'EB Garamond', Georgia, serif);
  font-weight: 600; font-size: 14px; color: var(--color-text1);
}
.nb-empty-desc {
  margin-top: 2px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
}
.nb-empty-retry { white-space: nowrap; }
`;
  document.head.appendChild(style);
}
