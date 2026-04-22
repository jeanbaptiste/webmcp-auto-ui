// @ts-nocheck
// ---------------------------------------------------------------------------
// notebook-document — collaborative doc layout (deepnote-like, serif prose)
// Title + optional presence avatars, inline highlights, margin comments w/
// editable body + replies, minimal cell chrome. Honest meta + real share.
// ---------------------------------------------------------------------------

import {
  createState, injectStyles, mountRunControls, mountHistoryPanel,
  setupDnD, deleteCellWithConfirm, restoreCellFromSnapshot, addCell,
  autosize, openShareModal, registerHistoryObserver,
  buildServersButton, collectDataServers,
  registerExecutor, logHistory, addImportedCells, fmtRelTime, uid,
  type NotebookState, type NotebookCell, type CellResult,
} from './shared.js';
import { dispatchShare } from './share-handlers.js';
import { renderProse } from './prose.js';
import {
  openAddMdModal, openAddRecipeModal,
} from './import-modals.js';
import {
  extractCellsFromRecipe, extractCellFromMarkdown,
} from './resource-extractor.js';
import { mountLeftPane } from './left-pane.js';
import { callToolViaPostMessage } from '@webmcp-auto-ui/core';

// ---------------------------------------------------------------------------
// Comment types (extended: body editable + threaded replies)
// ---------------------------------------------------------------------------

interface CommentNode {
  who: string;
  when: string;
  body: string;
  replies?: CommentNode[];
}

interface PresenceEditor {
  id?: string;
  initial?: string;
  color?: string;
}

// ---------------------------------------------------------------------------
// Executors — JS via new Function, SQL via MCP tool dispatch
// ---------------------------------------------------------------------------

function findSqlTool(data: Record<string, unknown>): { server: string; tool: string } | null {
  const servers = collectDataServers(data);
  const patterns = [/^.*query_sql$/i, /^(query|run|execute)(_sql)?$/i];
  for (const pat of patterns) {
    for (const srv of servers) {
      for (const t of srv.tools || []) {
        if (pat.test(t.name)) return { server: srv.name, tool: t.name };
      }
    }
  }
  return null;
}

function registerDocExecutors(state: NotebookState, data: Record<string, unknown>): void {
  // JS executor — runs in a new Function with access to state.scope
  registerExecutor(state, 'js', async (ctx): Promise<CellResult> => {
    const t0 = Date.now();
    try {
      const keys = Object.keys(ctx.scope);
      const vals = keys.map((k) => ctx.scope[k]);
      const src = ctx.cell.content || '';
      // Wrap in async function so `await` works inside user code
      const fn = new Function(...keys, `"use strict"; return (async () => { ${src} })();`);
      const out = await fn(...vals);
      const dur = Date.now() - t0;
      if (out === undefined || out === null) return { ok: true, kind: 'empty', durationMs: dur };
      if (Array.isArray(out) && out.length && typeof out[0] === 'object' && out[0] !== null) {
        const cols = Array.from(new Set(out.flatMap((r: any) => Object.keys(r))));
        return { ok: true, kind: 'table', rows: out as any, columns: cols, rowCount: out.length, durationMs: dur };
      }
      return { ok: true, kind: 'value', value: out, durationMs: dur };
    } catch (err: any) {
      return { ok: false, error: String(err?.message ?? err), errorKind: 'runtime', durationMs: Date.now() - t0 };
    }
  });

  // SQL executor — looks up a query_sql-like tool via regex and dispatches via postMessage
  registerExecutor(state, 'sql', async (ctx): Promise<CellResult> => {
    const t0 = Date.now();
    const hit = findSqlTool(data);
    if (!hit) {
      return { ok: false, error: 'No query_sql-like tool found on connected servers.', errorKind: 'schema', durationMs: Date.now() - t0 };
    }
    try {
      const res: any = await callToolViaPostMessage(hit.tool, { sql: ctx.cell.content });
      const dur = Date.now() - t0;
      // Heuristic: unwrap { rows, columns } or { result } shape
      const payload = res?.result ?? res;
      if (payload && Array.isArray(payload.rows)) {
        const rows = payload.rows as Record<string, unknown>[];
        const columns = Array.isArray(payload.columns) && payload.columns.length
          ? payload.columns
          : (rows.length ? Object.keys(rows[0]) : []);
        return { ok: true, kind: 'table', rows, columns, rowCount: rows.length, truncated: !!payload.truncated, durationMs: dur };
      }
      if (Array.isArray(payload) && payload.length && typeof payload[0] === 'object') {
        const rows = payload as Record<string, unknown>[];
        return { ok: true, kind: 'table', rows, columns: Object.keys(rows[0]), rowCount: rows.length, durationMs: dur };
      }
      if (payload == null) return { ok: true, kind: 'empty', durationMs: dur };
      return { ok: true, kind: 'value', value: payload, durationMs: dur };
    } catch (err: any) {
      return { ok: false, error: String(err?.message ?? err), errorKind: 'runtime', durationMs: Date.now() - t0 };
    }
  });
}

// ---------------------------------------------------------------------------
// Toast — tiny transient notification for share results
// ---------------------------------------------------------------------------

function toast(message: string): void {
  let host = document.getElementById('nb-toast-host') as HTMLElement | null;
  if (!host) {
    host = document.createElement('div');
    host.id = 'nb-toast-host';
    host.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2000;display:flex;flex-direction:column;gap:6px;pointer-events:none;';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.textContent = message;
  el.style.cssText = 'background:var(--color-surface,#222);color:var(--color-text1,#eee);border:1px solid var(--color-border,#444);padding:8px 14px;border-radius:6px;font-family:var(--font-mono,monospace);font-size:11.5px;box-shadow:0 2px 12px rgba(0,0,0,.3);opacity:0;transition:opacity .15s;';
  host.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 200); }, 2800);
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  injectStyles();
  injectLayoutStyles();

  const state: NotebookState = createState({
    id: data.id as string,
    title: data.title as string ?? 'Untitled notebook',
    mode: (data.mode as any) ?? 'edit',
    cells: data.cells as any,
  });

  registerDocExecutors(state, data);

  container.classList.add('nb-root');
  container.classList.toggle('nb-view-mode', state.mode === 'view');

  // Presence is opt-in: only shown when data.presence is explicitly provided.
  const presence = (data.presence as { editors?: PresenceEditor[]; count?: number } | undefined);
  const hasPresence = !!presence && Array.isArray(presence.editors) && presence.editors.length > 0;

  container.innerHTML = `
    <div class="nbd-shell">
      <div class="nbd-presence">
        ${hasPresence ? `
          <div class="nbd-avatars">
            ${presence!.editors!.slice(0, 3).map((e, i) => `
              <div class="nbd-av nbd-av${(i % 3) + 1}"${e.color ? ` style="background:${escapeAttr(e.color)}22;color:${escapeAttr(e.color)};"` : ''}>${escapeHtml((e.initial ?? '?').slice(0, 2).toUpperCase())}</div>
            `).join('')}
          </div>
          <span class="nbd-label">${presence!.count ?? presence!.editors!.length} editor${(presence!.count ?? presence!.editors!.length) > 1 ? 's' : ''} online</span>
        ` : ''}
        <div class="nb-mode-switch" style="margin-left:auto;">
          <button class="nb-mode-edit nb-on">edit</button>
          <button class="nb-mode-view">view</button>
        </div>
        <button class="nb-btn nbd-history-btn">⟲ history</button>
        <span class="nbd-servers-slot"></span>
      </div>
      <input class="nbd-title nb-doc-title" value="${escapeAttr(state.title)}">
      <div class="nbd-meta">edited <span class="nbd-edited-rel">${fmtRelTime(state.lastEditAt)}</span> ago</div>
      <div class="nb-history-panel nbd-history-panel"></div>
      <div class="nbd-cells"></div>
      <div class="nbd-footer">
        <button class="nb-btn nb-add-cell" data-add="md">+ text</button>
        <button class="nb-btn nb-add-cell" data-add="sql">+ sql</button>
        <button class="nb-btn nb-add-cell" data-add="js">+ code</button>
        <button class="nb-btn nbd-add-md-btn">+ md</button>
        <button class="nb-btn nbd-add-recipe-btn">+ recipe</button>
        <div class="nbd-spacer">
          <span class="nbd-share-link nbd-share-btn">share</span>
        </div>
      </div>
    </div>`;

  const shell = container.querySelector('.nbd-shell') as HTMLElement;
  const cellsEl = shell.querySelector('.nbd-cells') as HTMLElement;
  const historyPanel = shell.querySelector('.nbd-history-panel') as HTMLElement;
  const editedRelEl = shell.querySelector('.nbd-edited-rel') as HTMLElement;

  // Track active cell (last one clicked or focused) so imports insert near cursor
  let activeIdx: number | null = null;
  function activeCellIdx(): number | null { return activeIdx; }

  function renderCells() {
    cellsEl.innerHTML = '';
    state.cells.forEach((cell, idx) => {
      const el = renderCell(cell, state, rerender);
      el.addEventListener('mousedown', () => { activeIdx = idx; }, true);
      cellsEl.appendChild(el);
    });
  }

  function updateMeta() {
    if (editedRelEl) editedRelEl.textContent = fmtRelTime(state.lastEditAt);
  }

  function rerender() {
    mountHistoryPanel(historyPanel, state, (snap) => { restoreCellFromSnapshot(state, snap); rerender(); });
    renderCells();
    updateMeta();
  }

  shell.querySelectorAll<HTMLElement>('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.add as any;
      addCell(state, type);
      rerender();
    });
  });

  (shell.querySelector('.nbd-add-md-btn') as HTMLElement).addEventListener('click', () => {
    openAddMdModal((content) => {
      addImportedCells(state, [extractCellFromMarkdown(content)], activeCellIdx());
      rerender();
    });
  });

  (shell.querySelector('.nbd-add-recipe-btn') as HTMLElement).addEventListener('click', () => {
    openAddRecipeModal({
      mcpServers: (data?.servers as any[] | undefined)?.map((s: any) => ({ name: s.name, url: s.url })) ?? [],
      onPick: (recipe) => {
        addImportedCells(
          state,
          extractCellsFromRecipe(recipe.body ?? '', { title: recipe.name, description: recipe.description }),
          activeCellIdx(),
        );
        rerender();
      },
    });
  });

  (shell.querySelector('.nbd-history-btn') as HTMLElement).addEventListener('click', () => {
    historyPanel.classList.toggle('nb-open');
  });
  (shell.querySelector('.nbd-share-btn') as HTMLElement).addEventListener('click', () => {
    openShareModal(state, (fmt) => {
      dispatchShare(fmt, state, {
        container,
        onResult: (msg: string) => toast(msg),
      });
    });
  });
  (shell.querySelector('.nbd-title') as HTMLInputElement).addEventListener('input', (e) => {
    state.title = (e.target as HTMLInputElement).value;
    logHistory(state, 'edit', 'renamed notebook');
    updateMeta();
  });
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

  buildServersButton(state, shell.querySelector('.nbd-servers-slot') as HTMLElement, data, rerender);

  // Left pane — collapsed bookmarks-style panel (mounted into outer container,
  // not into shell, so it sits to the left of the document body)
  const leftHandle = mountLeftPane(container, state, collectDataServers(data), {
    onInjectCells: (cells) => {
      addImportedCells(state, cells, activeCellIdx());
      rerender();
    },
  });

  setupDnD(cellsEl, state, rerender);
  const unsubHistory = registerHistoryObserver(() => {
    mountHistoryPanel(historyPanel, state, (snap) => { restoreCellFromSnapshot(state, snap); rerender(); });
    updateMeta();
  });

  rerender();
  return () => {
    unsubHistory();
    try { leftHandle.destroy(); } catch { /* ignore */ }
  };
}

// ---------------------------------------------------------------------------
// Cell renderer
// ---------------------------------------------------------------------------

function renderCell(cell: NotebookCell, state: NotebookState, rerender: () => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'nb-cell-wrapper nbd-cell';
  wrap.dataset.id = cell.id;

  if (cell.type === 'md') {
    const handle = document.createElement('span');
    handle.className = 'nb-drag-handle nbd-md-handle';
    handle.draggable = true;
    handle.textContent = '⋮⋮';
    wrap.appendChild(handle);

    const p = document.createElement('div');
    p.className = 'nbd-prose';
    p.contentEditable = 'true';
    p.innerHTML = renderProse(cell.content);
    let proseDebounce: any = null;
    p.addEventListener('input', () => {
      // We store raw edited HTML as the content source.
      // A full MD roundtrip would need an HTML→MD converter; for v1 we preserve
      // the edited HTML as-is since renderProse is idempotent on safe HTML.
      cell.content = p.innerText;
      if (proseDebounce) clearTimeout(proseDebounce);
      proseDebounce = setTimeout(() => logHistory(state, 'edit', 'edited prose'), 400);
    });
    wrap.appendChild(p);

    const del = document.createElement('button');
    del.className = 'nb-icon-btn nb-danger nbd-del-abs';
    del.textContent = '✕';
    del.addEventListener('click', () =>
      deleteCellWithConfirm(state, cell, () => 'markdown block', rerender)
    );
    wrap.appendChild(del);
    return wrap;
  }

  const row = document.createElement('div');
  row.className = 'nbd-row' + (cell.comment ? '' : ' nbd-no-comment');

  const codeCell = document.createElement('div');
  codeCell.className = 'nb-code-cell nbd-code-cell';

  const head = document.createElement('div');
  head.className = 'nbd-cell-head';
  head.innerHTML = `
    <span class="nb-drag-handle" draggable="true" title="drag">⋮⋮</span>
    <span class="nbd-run-controls"></span>
    <span class="${cell.type === 'sql' ? 'nbd-type-sql' : 'nbd-type-js'}">${cell.type}</span>
    <span class="nbd-meta-info">${cell.lastMs != null ? cell.lastMs + 'ms' : ''}</span>
    <div class="nbd-actions">
      <button class="nb-icon-btn nb-toggle-src">${cell.hideSource ? '▸ src' : '◂ src'}</button>
      <button class="nb-icon-btn nb-toggle-res">${cell.hideResult ? '▸ res' : '◂ res'}</button>
      ${!cell.comment ? '<button class="nb-icon-btn nbd-add-comment" title="add comment">+ note</button>' : ''}
      <button class="nb-icon-btn nb-danger nbd-del">✕</button>
    </div>`;
  codeCell.appendChild(head);
  mountRunControls(head.querySelector('.nbd-run-controls') as HTMLElement, cell, wrap, state, rerender);

  const body = document.createElement('div');
  body.className = 'nbd-code-body' + (cell.hideSource ? ' nbd-hidden' : '');
  const ta = document.createElement('textarea');
  ta.className = 'nb-code-edit';
  ta.value = cell.content;
  ta.rows = 1;
  ta.spellcheck = false;
  ta.addEventListener('input', () => { cell.content = ta.value; autosize(ta); cell.status = 'stale'; });
  body.appendChild(ta);
  codeCell.appendChild(body);
  setTimeout(() => autosize(ta), 0);

  if (!cell.hideResult) {
    const res = renderResult(cell);
    if (res) codeCell.appendChild(res);
  }

  row.appendChild(codeCell);

  if (cell.comment) {
    row.appendChild(renderCommentColumn(cell, state, rerender));
  }

  (head.querySelector('.nb-toggle-src') as HTMLElement).addEventListener('click', () => { cell.hideSource = !cell.hideSource; rerender(); });
  (head.querySelector('.nb-toggle-res') as HTMLElement).addEventListener('click', () => { cell.hideResult = !cell.hideResult; rerender(); });
  const addCommentBtn = head.querySelector('.nbd-add-comment') as HTMLElement | null;
  if (addCommentBtn) {
    addCommentBtn.addEventListener('click', () => {
      (cell as any).comment = { who: 'you', when: 'now', body: 'write a note…', replies: [] } as CommentNode;
      logHistory(state, 'edit', 'added comment');
      rerender();
    });
  }
  (head.querySelector('.nbd-del') as HTMLElement).addEventListener('click', () =>
    deleteCellWithConfirm(state, cell, (c) => `${c.type} cell`, rerender)
  );

  wrap.appendChild(row);
  return wrap;
}

// ---------------------------------------------------------------------------
// Result rendering — switch on cell.lastResult.kind
// Document style: discrete tables, no ASCII bar charts.
// ---------------------------------------------------------------------------

function renderResult(cell: NotebookCell): HTMLElement | null {
  const res = cell.lastResult;
  if (!res) return null;

  const wrap = document.createElement('div');
  wrap.className = 'nbd-result-inline';

  if (!res.ok) {
    wrap.classList.add('nbd-result-error');
    wrap.innerHTML = `<div class="nbd-err-kind">${escapeHtml(res.errorKind ?? 'error')}</div><pre class="nbd-err-msg">${escapeHtml(res.error)}</pre>`;
    return wrap;
  }

  if (res.kind === 'empty') {
    wrap.innerHTML = `<div class="nbd-empty-res">— no output —</div>`;
    return wrap;
  }

  if (res.kind === 'value') {
    const val = res.value;
    const pretty = typeof val === 'string' ? val : (() => {
      try { return JSON.stringify(val, null, 2); } catch { return String(val); }
    })();
    wrap.innerHTML = `<pre class="nbd-value-res">${escapeHtml(pretty)}</pre>`;
    return wrap;
  }

  if (res.kind === 'chart') {
    // No ASCII bar chart — just a serif-discrete placeholder with spec preview
    const preview = (() => { try { return JSON.stringify(res.spec, null, 2); } catch { return String(res.spec); } })();
    wrap.innerHTML = `<div class="nbd-chart-note">chart · ${escapeHtml(preview.slice(0, 80))}${preview.length > 80 ? '…' : ''}</div>`;
    return wrap;
  }

  if (res.kind === 'table') {
    const cols = res.columns.length ? res.columns : (res.rows[0] ? Object.keys(res.rows[0]) : []);
    const preview = res.rows.slice(0, 12);
    const tbl = document.createElement('table');
    tbl.className = 'nbd-table';
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>${cols.map((c) => `<th>${escapeHtml(String(c))}</th>`).join('')}</tr>`;
    tbl.appendChild(thead);
    const tbody = document.createElement('tbody');
    tbody.innerHTML = preview.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(formatCell((r as any)[c]))}</td>`).join('')}</tr>`).join('');
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);
    if (res.rowCount > preview.length || res.truncated) {
      const foot = document.createElement('div');
      foot.className = 'nbd-table-foot';
      foot.textContent = `${res.rowCount} rows${res.truncated ? ' · truncated' : ''}`;
      wrap.appendChild(foot);
    }
    return wrap;
  }

  return null;
}

function formatCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
  return String(v);
}

// ---------------------------------------------------------------------------
// Comments — editable body + threaded replies
// ---------------------------------------------------------------------------

function renderCommentColumn(cell: NotebookCell, state: NotebookState, rerender: () => void): HTMLElement {
  const col = document.createElement('div');
  col.className = 'nbd-comment';

  const root = (cell.comment as any as CommentNode);
  // Ensure replies array exists
  if (!Array.isArray(root.replies)) root.replies = [];

  col.appendChild(renderCommentNode(root, state, () => {
    logHistory(state, 'edit', 'edited comment');
  }));

  // Replies — rendered with indent
  const repliesWrap = document.createElement('div');
  repliesWrap.className = 'nbd-replies';
  root.replies!.forEach((reply) => {
    const rel = renderCommentNode(reply, state, () => logHistory(state, 'edit', 'edited reply'));
    rel.classList.add('nbd-reply');
    repliesWrap.appendChild(rel);
  });
  col.appendChild(repliesWrap);

  const replyBtn = document.createElement('button');
  replyBtn.className = 'nb-icon-btn nbd-reply-btn';
  replyBtn.textContent = '+ reply';
  replyBtn.addEventListener('click', () => {
    root.replies!.push({ who: 'you', when: 'now', body: 'write a reply…' });
    logHistory(state, 'edit', 'added reply');
    rerender();
  });
  col.appendChild(replyBtn);

  return col;
}

function renderCommentNode(
  node: CommentNode,
  _state: NotebookState,
  onEdit: () => void,
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'nbd-comment-node';
  el.innerHTML = `
    <div class="nbd-comment-who">
      <div class="nbd-av-small">${escapeHtml((node.who || '?').slice(0, 2).toUpperCase())}</div>
      <span class="nbd-who-name">${escapeHtml(node.who || '')}</span>
      <span class="nbd-when">${escapeHtml(node.when || '')}</span>
    </div>
    <div class="nbd-comment-body" contenteditable="true" spellcheck="false"></div>`;
  const body = el.querySelector('.nbd-comment-body') as HTMLElement;
  body.textContent = node.body || '';
  let deb: any = null;
  body.addEventListener('input', () => {
    node.body = body.innerText;
    if (deb) clearTimeout(deb);
    deb = setTimeout(() => onEdit(), 300);
  });
  return el;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return (s ?? '').toString().replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
}
function escapeAttr(s: string): string {
  return (s ?? '').toString().replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Layout styles — serif "document" look
// ---------------------------------------------------------------------------

function injectLayoutStyles(): void {
  if (document.getElementById('nbd-styles')) return;
  const style = document.createElement('style');
  style.id = 'nbd-styles';
  style.textContent = `
.nbd-shell {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 28px 32px;
  font-family: Palatino, 'Palatino Linotype', Georgia, serif;
}
.nbd-presence { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.nbd-avatars { display: flex; }
.nbd-av {
  width: 22px; height: 22px; border-radius: 50%;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 9px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--color-surface);
}
.nbd-av + .nbd-av { margin-left: -6px; }
.nbd-av1 { background: rgba(124,109,250,0.25); color: var(--color-accent); }
.nbd-av2 { background: rgba(62,207,178,0.22); color: var(--color-teal); }
.nbd-av3 { background: rgba(240,160,80,0.22); color: var(--color-amber); }
.nbd-label {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
}
.nbd-title {
  font-family: Palatino, 'Palatino Linotype', Georgia, serif;
  font-size: 28px; font-weight: 600;
  letter-spacing: -0.01em; margin: 6px 0 2px;
  background: transparent; border: none; outline: none;
  color: var(--color-text1);
  width: 100%; padding: 2px 4px; border-radius: 3px;
}
.nbd-title:focus { background: var(--color-bg); }
.nbd-meta {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
  margin-bottom: 20px;
}
.nbd-history-panel { margin-bottom: 12px; }

.nbd-cell { position: relative; margin-bottom: 18px; }
.nbd-prose {
  font-family: Palatino, 'Palatino Linotype', Georgia, serif;
  font-size: 16px; line-height: 1.7;
  color: var(--color-text1);
  outline: none;
  padding: 4px 6px;
  border-radius: 3px;
  border: 1px dashed transparent;
  text-align: justify;
}
.nbd-prose:focus { border-color: var(--color-border); background: var(--color-bg); }
.nbd-prose mark {
  background: rgba(240,160,80,0.18);
  color: var(--color-amber);
  padding: 0 4px; border-radius: 2px;
}
.nbd-prose h1, .nbd-prose h2, .nbd-prose h3 {
  font-family: Palatino, 'Palatino Linotype', Georgia, serif;
  text-align: left; margin: 1em 0 0.4em;
}
.nbd-md-handle { position: absolute; left: -20px; top: 6px; }
.nbd-del-abs {
  position: absolute; top: 4px; right: 4px;
  opacity: 0; transition: opacity 0.15s;
}
.nbd-cell:hover .nbd-del-abs { opacity: 0.5; }
.nbd-del-abs:hover { opacity: 1 !important; }

.nbd-row {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 16px; align-items: start;
}
.nbd-row.nbd-no-comment { grid-template-columns: 1fr; }

.nbd-code-cell {
  border: 1px solid var(--color-border);
  border-radius: 8px; overflow: hidden;
  background: var(--color-bg);
}
.nbd-cell-head {
  padding: 7px 12px;
  display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid var(--color-border);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10.5px; color: var(--color-text2);
}
.nbd-type-sql { color: var(--color-accent); text-transform: uppercase; letter-spacing: 0.08em; font-size: 9.5px; }
.nbd-type-js { color: var(--color-teal); text-transform: uppercase; letter-spacing: 0.08em; font-size: 9.5px; }
.nbd-actions { margin-left: auto; display: flex; gap: 6px; }
.nbd-code-body { padding: 11px 12px; }
.nbd-hidden { display: none !important; }

.nbd-result-inline {
  background: var(--color-surface2);
  padding: 10px 12px;
  border-top: 1px solid var(--color-border);
  font-family: Palatino, 'Palatino Linotype', Georgia, serif;
  font-size: 13px;
  color: var(--color-text1);
}
.nbd-result-inline.nbd-result-error {
  background: rgba(250,109,124,0.08);
  border-top-color: var(--color-accent2);
}
.nbd-err-kind {
  font-family: var(--font-mono, monospace);
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--color-accent2); margin-bottom: 4px;
}
.nbd-err-msg {
  font-family: var(--font-mono, monospace);
  font-size: 11.5px; color: var(--color-text1);
  white-space: pre-wrap; margin: 0;
}
.nbd-empty-res {
  font-style: italic; color: var(--color-text2); font-size: 12px;
}
.nbd-value-res {
  font-family: var(--font-mono, monospace);
  font-size: 11.5px; color: var(--color-text1);
  white-space: pre-wrap; margin: 0;
}
.nbd-chart-note {
  font-family: var(--font-mono, monospace);
  font-size: 11px; color: var(--color-text2);
  font-style: italic;
}
.nbd-table {
  width: 100%; border-collapse: collapse;
  font-variant-numeric: tabular-nums;
  font-family: Palatino, 'Palatino Linotype', Georgia, serif;
  font-size: 12.5px;
}
.nbd-table th {
  text-align: left; font-weight: 500; font-style: italic;
  color: var(--color-text2);
  border-bottom: 1px solid var(--color-border);
  padding: 4px 10px 4px 0;
}
.nbd-table td {
  padding: 3px 10px 3px 0;
  color: var(--color-text1);
  border-bottom: 1px solid rgba(160,160,184,0.08);
}
.nbd-table tr:last-child td { border-bottom: none; }
.nbd-table-foot {
  font-family: var(--font-mono, monospace);
  font-size: 10px; color: var(--color-text2);
  margin-top: 6px; font-style: italic;
}

.nbd-comment {
  background: rgba(240,160,80,0.08);
  border-left: 2px solid var(--color-amber);
  border-radius: 0 6px 6px 0;
  padding: 10px 12px;
  font-size: 12px;
  display: flex; flex-direction: column; gap: 6px;
}
.nbd-comment-who { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.nbd-av-small {
  width: 15px; height: 15px; border-radius: 50%;
  background: rgba(240,160,80,0.25); color: var(--color-amber);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 8px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.nbd-who-name {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10.5px; color: var(--color-amber); font-weight: 500;
}
.nbd-when {
  margin-left: auto;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; color: var(--color-text2);
}
.nbd-comment-body {
  color: var(--color-text1); line-height: 1.5;
  outline: none; min-height: 1.2em;
  padding: 2px 4px; border-radius: 3px;
  border: 1px dashed transparent;
  font-family: Palatino, 'Palatino Linotype', Georgia, serif;
}
.nbd-comment-body:focus {
  border-color: rgba(240,160,80,0.3);
  background: rgba(255,255,255,0.02);
}
.nbd-replies {
  display: flex; flex-direction: column; gap: 6px;
  margin-left: 10px;
  border-left: 1px solid rgba(240,160,80,0.25);
  padding-left: 8px;
}
.nbd-reply { font-size: 11.5px; }
.nbd-reply .nbd-comment-body { font-size: 11.5px; }
.nbd-reply-btn {
  align-self: flex-start;
  font-size: 10.5px !important;
  color: var(--color-amber) !important;
  padding: 2px 6px !important;
}
.nbd-add-comment {
  color: var(--color-amber) !important;
}

.nbd-footer {
  display: flex; gap: 8px;
  padding-top: 14px; margin-top: 20px;
  border-top: 1px solid var(--color-border);
  align-items: center;
}
.nbd-spacer { margin-left: auto; }
.nbd-share-link {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
  cursor: pointer;
  padding: 5px 11px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}
.nbd-share-link:hover { color: var(--color-text1); border-color: var(--color-border2); }
`;
  document.head.appendChild(style);
}
