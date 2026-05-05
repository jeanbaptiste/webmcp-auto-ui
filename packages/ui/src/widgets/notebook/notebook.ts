// @ts-nocheck
// ---------------------------------------------------------------------------
// notebook — publication-ready layout (observable-like)
// Serif prose + cells in a single ordered list, all drag-and-droppable together.
// Cells alternate freely: md (prose paragraph) / sql / js cells share the flow.
// ---------------------------------------------------------------------------

import {
  createState, injectStyles, mountRunControls, mountHistoryPanel,
  setupDnD, deleteCellWithConfirm, restoreCellFromSnapshot, addCell,
  addImportedCells, registerExecutor, collectDataServers, collectWebmcpServers,
  autosize, openShareModal, registerHistoryObserver,
  renderCellLogs, uid, defaultCellContent,
  createPublishControls, autoConnectFrontmatterServers,
  createRuntimeOverlay, effectiveResult, cellRuntimeStatus,
  lastRefreshedAt, bootstrapLiveRefresh, fmtRelTime, preserveScrollAround,
  type NotebookState, type NotebookCell, type CellResult, type CellExecContext,
  type RuntimeOverlay,
} from './shared.js';
import { renderChart } from './chart-renderer.js';
import { dispatchShare } from './share-handlers.js';
import { renderProse, mountEditableProse } from './prose.js';
import { openAddMdModal, openAddRecipeModal } from './import-modal-api.js';
import { extractCellsFromRecipe, extractCellFromMarkdown } from './resource-extractor.js';
import { mountLeftPane } from './left-pane.js';
import { highlightCode } from '../../primitives/markdown-renderer.js';
import { createSqlExecutor } from './executors/sql.js';
import { runCode } from '@webmcp-auto-ui/sdk';
import { canvas } from '@webmcp-auto-ui/sdk/canvas';
import { mountWidget } from '@webmcp-auto-ui/core';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  injectStyles();
  injectLayoutStyles();

  const state: NotebookState = createState({
    id: data.id as string,
    title: data.title as string ?? 'Untitled notebook',
    mode: (data.mode as any) ?? 'edit',
    cells: data.cells as any,
    autoRun: (data as any).autoRun === true,
    publishedSlug: (data as any).publishedSlug,
    publishedToken: (data as any).publishedToken,
    webmcpServers: (data as any).webmcpServers,
  });

  // Live mode runtime overlay (created lazily). Never mutates state.
  let overlay: RuntimeOverlay | null = null;
  let liveCleanup: (() => void) | null = null;

  // --- register executors -------------------------------------------------
  registerExecutor(state, 'js', jsExecutor);
  registerExecutor(state, 'sql', createSqlExecutor(() => collectDataServers(data)));

  container.classList.add('nb-root');
  container.classList.toggle('nb-view-mode', state.mode === 'view');

  container.innerHTML = `
    <div class="nbe-outer">
      <div class="nbe-leftpane-slot"></div>
      <div class="nbe-shell">
        <div class="nbe-kicker">
          <div class="nb-mode-switch" style="margin-left:auto;">
            <button class="nb-mode-edit ${state.mode === 'edit' ? 'nb-on' : ''}">edit</button>
            <button class="nb-mode-view ${state.mode === 'view' ? 'nb-on' : ''}">view</button>
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
        const mcpServers = collectDataServers(data)
          .map((s) => ({ name: s.name, url: s.url }));
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


  // Left pane (collapsed by default). Lists remote data servers AND bundled
  // WebMCP servers (autoui, d3, …) in two distinct groups.
  const collectAll = () => [
    ...collectDataServers(data),
    ...collectWebmcpServers(state.webmcpServers),
  ];
  const pane = mountLeftPane(leftPaneHost, state, collectAll(), {
    onInjectCells: (cells) => {
      addImportedCells(state, cells, activeCellIdx());
      rerender();
    },
  });

  // Auto-connect data servers declared in the recipe frontmatter (data.servers).
  // The notebook reads MCP state passively from canvas.dataServers.
  autoConnectFrontmatterServers(data, () => pane.setServers(collectAll()));

  // Keep pane servers in sync with canvas changes
  let canvasUnsub: (() => void) | null = null;
  try {
    const canvasAny: any = (globalThis as any).__canvasVanilla || (globalThis as any).canvasVanilla;
    if (canvasAny?.subscribe) {
      canvasUnsub = canvasAny.subscribe(() => pane.setServers(collectAll()));
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
  // Accept both `call(...)` (SDK) and `callTool(...)` (legacy / AI-generated)
  // as aliases. runCode injects `call` and `widget` helpers around an
  // AsyncFunction body, so top-level `await` and MCP calls work uniformly.
  const code = cell.content.replace(/\bcallTool\s*\(/g, 'call(');
  const res = await runCode(code, 'js', canvas.multiClient, scope);
  const durationMs = Date.now() - start;
  if (res.status === 'error') {
    return { ok: false, error: res.error ?? 'error', errorKind: 'runtime', durationMs, logs: res.logs };
  }
  // Widgets emitted via `widget(name, params)` or via `*_widget_display(...)`
  // calls — surface them as a dedicated kind so the host can mount them.
  const widgets = res.widgets ?? (res.widget ? [res.widget] : []);
  if (widgets.length > 0) {
    return { ok: true, kind: 'widget', widgets, durationMs, logs: res.logs };
  }
  const result = res.output;
  if (result === undefined || result === null) return { ok: true, kind: 'empty', durationMs, logs: res.logs };
  if (Array.isArray(result)) {
    const rows = result.filter((r) => r && typeof r === 'object') as Record<string, unknown>[];
    const columns = rows.length ? Array.from(new Set(rows.flatMap((r) => Object.keys(r)))) : [];
    return { ok: true, kind: 'table', rows, columns, rowCount: rows.length, durationMs, logs: res.logs };
  }
  if (result && typeof result === 'object') {
    const r: any = result;
    if (r.data || r.marks || r.mark || r.$schema) {
      return { ok: true, kind: 'chart', spec: result, durationMs, logs: res.logs };
    }
  }
  return { ok: true, kind: 'value', value: result, durationMs, logs: res.logs };
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
    const ro = new ResizeObserver(() => autosize(ta));
    ro.observe(ta);
  }
  codeCell.appendChild(body);

  if (!cell.hideResult) {
    const res = document.createElement('div');
    res.className = 'nbe-result';
    renderResultInto(res, cell, overlay, state);
    codeCell.appendChild(res);
  }

  wrap.appendChild(codeCell);

  (head.querySelector('.nb-toggle-src') as HTMLElement).addEventListener('click', () => { cell.hideSource = !cell.hideSource; rerender(); });
  (head.querySelector('.nb-toggle-res') as HTMLElement).addEventListener('click', () => { cell.hideResult = !cell.hideResult; rerender(); });

  if (state.mode !== 'view') wrap.appendChild(renderCellActionBar(state, cell, rerender));

  return wrap;
}

/**
 * Per-cell action bar: [+ text] [+ sql] [+ JS] [+ widget] [+ agent]
 * Inserts a new cell directly after this one, or opens a picker / agent input.
 * `widget` and `agent` are wired in dedicated handlers below.
 */
function renderCellActionBar(state: NotebookState, cell: NotebookCell, rerender: () => void): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'nbe-cell-actionbar';
  const idx = state.cells.findIndex((c) => c.id === cell.id);
  const insertAfter = (type: 'md' | 'sql' | 'js', content?: string) => {
    const newCell: NotebookCell = {
      id: uid(),
      type,
      content: content ?? defaultCellContent(type),
      hideSource: false, hideResult: false, status: 'stale',
    };
    addImportedCells(state, [newCell], idx);
    rerender();
  };
  bar.innerHTML = `
    <button class="nb-btn nb-cellbar-btn" data-add="md">+ text</button>
    <button class="nb-btn nb-cellbar-btn" data-add="sql">+ sql</button>
    <button class="nb-btn nb-cellbar-btn" data-add="js">+ JS</button>
    <button class="nb-btn nb-cellbar-btn" data-cellbar="widget">+ widget</button>
    <button class="nb-btn nb-cellbar-btn" data-cellbar="agent">+ agent</button>`;
  bar.querySelectorAll<HTMLElement>('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => insertAfter(btn.dataset.add as 'md' | 'sql' | 'js'));
  });
  bar.querySelector<HTMLElement>('[data-cellbar="widget"]')?.addEventListener('click', () => {
    openWidgetPicker(state, cell, rerender);
  });
  bar.querySelector<HTMLElement>('[data-cellbar="agent"]')?.addEventListener('click', () => {
    toggleAgentBar(bar, state, cell, rerender);
  });
  return bar;
}

/**
 * +widget picker — lists the recipes exposed by every active WebMCP server
 * (state.webmcpServers, populated from frontmatter.webmcp_servers). On pick,
 * inserts a JS cell after the current one with a template that reads the
 * upstream cell's varname (default 'rows') and renders the widget.
 */
function openWidgetPicker(state: NotebookState, cell: NotebookCell, rerender: () => void): void {
  const servers = state.webmcpServers ?? [];
  type Item = { server: string; name: string; description?: string };
  const items: Item[] = [];
  for (const s of servers) {
    const recipes = s.layer().recipes ?? [];
    for (const r of recipes) items.push({ server: s.name, name: r.name, description: r.description });
  }
  if (items.length === 0) {
    toastNoServers();
    return;
  }
  const upstreamVar = findUpstreamVarname(state, cell);
  const overlay = document.createElement('div');
  overlay.className = 'nbe-picker-overlay';
  overlay.innerHTML = `
    <div class="nbe-picker">
      <header>
        <input class="nbe-picker-q" placeholder="filter widgets…" autofocus />
        <button class="nbe-picker-close" type="button">✕</button>
      </header>
      <ul class="nbe-picker-list"></ul>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => { try { overlay.remove(); } catch { /* ignore */ } };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  (overlay.querySelector('.nbe-picker-close') as HTMLElement).addEventListener('click', close);
  const list = overlay.querySelector('.nbe-picker-list') as HTMLElement;
  const q = overlay.querySelector('.nbe-picker-q') as HTMLInputElement;
  const render = (filter = '') => {
    const f = filter.toLowerCase().trim();
    list.innerHTML = items
      .filter((i) => !f || i.name.toLowerCase().includes(f) || (i.description ?? '').toLowerCase().includes(f) || i.server.toLowerCase().includes(f))
      .map((i) => `<li data-name="${escapeAttr(i.name)}" data-server="${escapeAttr(i.server)}">
        <span class="nbe-picker-name">${escapeHtml(i.name)}</span>
        <span class="nbe-picker-server">${escapeHtml(i.server)}</span>
        <span class="nbe-picker-desc">${escapeHtml(i.description ?? '')}</span>
      </li>`).join('');
  };
  render();
  q.addEventListener('input', () => render(q.value));
  list.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest('li[data-name]') as HTMLElement | null;
    if (!li) return;
    const name = li.dataset.name as string;
    const idx = state.cells.findIndex((c) => c.id === cell.id);
    const template = upstreamVar
      ? `return widget('${name}', { rows: ${upstreamVar} })`
      : `return widget('${name}', {})`;
    const newCell: NotebookCell = {
      id: uid(), type: 'js',
      content: template,
      hideSource: false, hideResult: false, status: 'stale',
    };
    addImportedCells(state, [newCell], idx);
    close();
    rerender();
  });
  function toastNoServers() {
    const t = document.createElement('div');
    t.className = 'nbe-toast nbe-toast-error nbe-toast-in';
    t.textContent = 'No WebMCP server is enabled — add some in flex first (autoui, d3, observable-plot…)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }
}

/**
 * Walk back from `cell` to find the nearest cell with a varname (typically a
 * SQL cell). The widget template will bind to that variable so the chosen
 * widget visualises the upstream cell's output. Returns null if none.
 */
function findUpstreamVarname(state: NotebookState, cell: NotebookCell): string | null {
  const idx = state.cells.findIndex((c) => c.id === cell.id);
  for (let i = idx; i >= 0; i--) {
    const c = state.cells[i];
    if (c?.varname) return c.varname;
  }
  return null;
}

/**
 * +agent bar — toggled inline below the cell action bar. The user types a
 * prompt in <auto-chat-input>, runAgentLoop is invoked with a focused tool
 * layer that lets the LLM:
 *   - read the current cell + scope
 *   - rewrite the current cell content
 *   - insert a new cell after it (text / sql / js / widget)
 * Every mutation logs into state.history so the user can ⟲ revert.
 * Provider: RemoteLLMProvider via /api/chat (proxy reads env LLM_API_KEY).
 */
function toggleAgentBar(host: HTMLElement, state: NotebookState, cell: NotebookCell, rerender: () => void): void {
  const existing = host.parentElement?.querySelector(':scope > .nbe-agent-bar');
  if (existing) { existing.remove(); return; }
  const bar = document.createElement('div');
  bar.className = 'nbe-agent-bar';
  bar.innerHTML = `
    <auto-chat-input placeholder="ask agent — e.g. 'filter rows where votes > 50' / 'add a sankey of this'"></auto-chat-input>
    <div class="nbe-agent-status" hidden></div>`;
  host.insertAdjacentElement('afterend', bar);
  const input = bar.querySelector('auto-chat-input') as HTMLElement & { disabled?: boolean };
  const status = bar.querySelector('.nbe-agent-status') as HTMLElement;
  let aborter: AbortController | null = null;
  input.addEventListener('widget:interact', (e: Event) => {
    const detail = (e as CustomEvent).detail ?? {};
    const action = (detail as { action?: string }).action;
    if (action === 'stop') { aborter?.abort(); return; }
    if (action !== 'submit') return;
    const text = ((detail as { payload?: { text?: string } }).payload?.text ?? '').trim();
    if (!text) return;
    void runAgentForCell(text, state, cell, rerender, status, input, () => aborter ??= new AbortController());
  });
}

async function runAgentForCell(
  prompt: string,
  state: NotebookState,
  cell: NotebookCell,
  rerender: () => void,
  status: HTMLElement,
  input: HTMLElement & { disabled?: boolean },
  getAborter: () => AbortController,
): Promise<void> {
  status.hidden = false;
  status.textContent = '…';
  input.disabled = true;
  const aborter = getAborter();
  try {
    // Lazy import to keep notebook bundle slim when agent is unused.
    const { RemoteLLMProvider, runAgentLoop } = await import('@webmcp-auto-ui/agent');
    const provider = new RemoteLLMProvider({ proxyUrl: '/api/chat', model: 'haiku' });
    const layer = buildAgentLayerForCell(state, cell, rerender);
    const systemPrompt = buildAgentSystemPromptForCell(state, cell);
    await runAgentLoop(prompt, {
      provider,
      layers: [layer],
      systemPrompt,
      maxIterations: 6,
      signal: aborter.signal,
      callbacks: {
        onToolCall: (name: string) => { status.textContent = `· ${name}…`; },
      },
    });
    status.textContent = '✓ done';
  } catch (err) {
    status.textContent = 'error: ' + String((err as { message?: unknown })?.message ?? err);
  } finally {
    input.disabled = false;
  }
}

/**
 * Build the WebMCP tool layer the agent sees. Tools mutate state via the
 * shared helpers (addImportedCells, logHistory) so revert via ⟲ history works
 * exactly like a manual edit.
 */
function buildAgentLayerForCell(state: NotebookState, cell: NotebookCell, rerender: () => void) {
  const idx = () => state.cells.findIndex((c) => c.id === cell.id);
  const tools = [
    {
      name: 'get_current_cell',
      description: 'Read the cell the user invoked the agent on (id, type, content, varname).',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({
        id: cell.id, type: cell.type,
        content: cell.content,
        varname: (cell as { varname?: string }).varname,
      }),
    },
    {
      name: 'list_cells',
      description: 'List all cells in the notebook (id, type, short content preview).',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => state.cells.map((c) => ({
        id: c.id, type: c.type,
        preview: (c.content ?? '').slice(0, 120),
        varname: (c as { varname?: string }).varname,
      })),
    },
    {
      name: 'update_cell',
      description: 'Replace the current cell content with new code/markdown. The cell type is preserved.',
      inputSchema: {
        type: 'object',
        properties: { content: { type: 'string', description: 'New full content for the cell.' } },
        required: ['content'],
      },
      execute: async (args: Record<string, unknown>) => {
        const next = String(args.content ?? '');
        const before = cell.content;
        if (before === next) return { ok: true, unchanged: true };
        // Snapshot prior content so logHistory can support revert.
        cell.content = next;
        cell.status = 'stale';
        state.lastEditAt = Date.now();
        // Manual history entry — reuse `edit` kind, summary mentions agent.
        try {
          (state.history ?? []).push({
            ts: Date.now(), kind: 'edit',
            summary: `agent edited ${cell.type} cell`,
            snapshot: { cellId: cell.id, before, after: next },
          } as never);
        } catch { /* ignore — best-effort */ }
        rerender();
        return { ok: true };
      },
    },
    {
      name: 'insert_cell_after',
      description: 'Insert a new cell directly after the current one. Use type=text for prose, sql for queries, js for scripts/widgets.',
      inputSchema: {
        type: 'object',
        properties: {
          type:    { type: 'string', enum: ['text', 'sql', 'js'], description: '"text" for markdown prose, "sql" for a query, "js" for a script (use widget(name, params) to render a widget).' },
          content: { type: 'string', description: 'Cell content.' },
          varname: { type: 'string', description: 'Optional varname for sql/js cells — exposes the result as a variable to subsequent cells.' },
        },
        required: ['type', 'content'],
      },
      execute: async (args: Record<string, unknown>) => {
        const t = String(args.type ?? '');
        const type: NotebookCell['type'] = t === 'text' ? 'md' : t === 'sql' ? 'sql' : 'js';
        const newCell: NotebookCell = {
          id: uid(), type,
          content: String(args.content ?? ''),
          hideSource: false, hideResult: false, status: 'stale',
          ...(args.varname ? { varname: String(args.varname) } : {}),
        };
        addImportedCells(state, [newCell], idx());
        rerender();
        return { ok: true, id: newCell.id };
      },
    },
    {
      name: 'list_widgets',
      description: 'List widgets exposed by the connected WebMCP servers — pickable in JS cells via widget(name, params).',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        const out: Array<{ server: string; name: string; description?: string }> = [];
        for (const s of state.webmcpServers ?? []) {
          for (const r of s.layer().recipes ?? []) out.push({ server: s.name, name: r.name, description: r.description });
        }
        return out;
      },
    },
  ];
  return { protocol: 'webmcp' as const, serverName: 'notebook-editor', tools, recipes: [] };
}

function buildAgentSystemPromptForCell(_state: NotebookState, cell: NotebookCell): string {
  return [
    'You are an in-notebook editing assistant. The user invoked you on a specific cell.',
    'Your job: rewrite that cell, OR insert a follow-up cell after it, based on the user\'s prompt.',
    `The current cell is of type "${cell.type}".`,
    'Workflow:',
    '  1. Call get_current_cell to read the cell content + varname.',
    '  2. If the user wants to TRANSFORM the existing cell (filter, refactor, fix), call update_cell.',
    '  3. If the user wants a FOLLOW-UP step (chart, summary, follow-up query), call insert_cell_after.',
    '  4. For widgets: call list_widgets first to discover available names, then write a JS cell with `return widget("<name>", { rows, ...params })`.',
    'Be terse. One or two tool calls is usually enough. Do not explain at length.',
  ].join('\n');
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

function renderResultInto(el: HTMLElement, cell: NotebookCell, overlay: RuntimeOverlay | null, stateRef?: NotebookState): void {
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
  if (r.kind === 'widget') {
    const fallbackServers = stateRef?.webmcpServers ?? [];
    for (const w of r.widgets) {
      const host = document.createElement('div');
      host.className = 'nb-widget-host';
      el.appendChild(host);
      try { mountWidget(host, w.name, w.params, fallbackServers); }
      catch (err) {
        const pre = document.createElement('pre');
        pre.className = 'nbe-result-error';
        pre.textContent = `widget "${w.name}" failed: ${String((err as { message?: unknown })?.message ?? err)}`;
        host.appendChild(pre);
      }
    }
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
  opacity: 0.65; transition: opacity 0.15s;
  width: 26px; height: 26px;
  font-size: 16px; line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0;
  z-index: 2;
}
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
  padding: 7px 44px 7px 12px;
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
