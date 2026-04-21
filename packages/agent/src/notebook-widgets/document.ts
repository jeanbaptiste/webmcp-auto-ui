// @ts-nocheck
// ---------------------------------------------------------------------------
// notebook-document — collaborative doc layout (deepnote-like)
// Title + avatars, inline highlights, margin comments, minimal cell chrome.
// ---------------------------------------------------------------------------

import {
  createState, injectStyles, mountRunControls, mountHistoryPanel,
  setupDnD, deleteCellWithConfirm, restoreCellFromSnapshot, addCell,
  autosize, openShareModal, registerHistoryObserver,
  buildServersButton,
  type NotebookState, type NotebookCell,
} from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  injectStyles();
  injectLayoutStyles();

  const state: NotebookState = createState({
    id: data.id as string,
    title: data.title as string ?? 'Untitled notebook',
    mode: (data.mode as any) ?? 'edit',
    cells: data.cells as any,
  });

  container.classList.add('nb-root');
  container.classList.toggle('nb-view-mode', state.mode === 'view');

  container.innerHTML = `
    <div class="nbd-shell">
      <div class="nbd-presence">
        <div class="nbd-avatars">
          <div class="nbd-av nbd-av1">A</div>
          <div class="nbd-av nbd-av2">B</div>
          <div class="nbd-av nbd-av3">+1</div>
        </div>
        <span class="nbd-label">3 editors online</span>
        <div class="nb-mode-switch" style="margin-left:auto;">
          <button class="nb-mode-edit nb-on">edit</button>
          <button class="nb-mode-view">view</button>
        </div>
        <button class="nb-btn nbd-history-btn">⟲ history</button>
        <span class="nbd-servers-slot"></span>
      </div>
      <input class="nbd-title nb-doc-title" value="${escapeAttr(state.title)}">
      <div class="nbd-meta">edited just now · saved ✓</div>
      <div class="nb-history-panel nbd-history-panel"></div>
      <div class="nbd-cells"></div>
      <div class="nbd-footer">
        <button class="nb-btn nb-add-cell" data-add="md">+ text</button>
        <button class="nb-btn nb-add-cell" data-add="sql">+ sql</button>
        <button class="nb-btn nb-add-cell" data-add="js">+ code</button>
        <div class="nbd-spacer">
          <span class="nbd-share-link nbd-share-btn">invite · share</span>
        </div>
      </div>
    </div>`;

  const shell = container.querySelector('.nbd-shell') as HTMLElement;
  const cellsEl = shell.querySelector('.nbd-cells') as HTMLElement;
  const historyPanel = shell.querySelector('.nbd-history-panel') as HTMLElement;

  function renderCells() {
    cellsEl.innerHTML = '';
    state.cells.forEach((cell) => cellsEl.appendChild(renderCell(cell, state, rerender)));
  }

  function rerender() {
    mountHistoryPanel(historyPanel, state, (snap) => { restoreCellFromSnapshot(state, snap); rerender(); });
    renderCells();
  }

  shell.querySelectorAll<HTMLElement>('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.add as any;
      addCell(state, type);
      rerender();
    });
  });
  (shell.querySelector('.nbd-history-btn') as HTMLElement).addEventListener('click', () => {
    historyPanel.classList.toggle('nb-open');
  });
  (shell.querySelector('.nbd-share-btn') as HTMLElement).addEventListener('click', () => {
    openShareModal(state, (fmt) => console.log('[notebook-document] share as', fmt, state));
  });
  (shell.querySelector('.nbd-title') as HTMLInputElement).addEventListener('input', (e) => {
    state.title = (e.target as HTMLInputElement).value;
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

  setupDnD(cellsEl, state, rerender);
  const unsubHistory = registerHistoryObserver(() => mountHistoryPanel(historyPanel, state, (snap) => { restoreCellFromSnapshot(state, snap); rerender(); }));

  rerender();
  return () => { unsubHistory(); };
}

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
    p.innerHTML = cell.content;
    p.addEventListener('input', () => { cell.content = p.innerHTML; });
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
      <button class="nb-icon-btn nb-danger nbd-del">✕</button>
    </div>`;
  codeCell.appendChild(head);
  mountRunControls(head.querySelector('.nbd-run-controls') as HTMLElement, cell, wrap, rerender);

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

  if (cell.type === 'sql' && !cell.hideResult) {
    const res = document.createElement('div');
    res.className = 'nbd-result-inline';
    res.innerHTML = `
      <table>
        <tr><td>row_1</td><td>42</td></tr>
        <tr><td>row_2</td><td>29</td></tr>
        <tr><td>row_3</td><td>22</td></tr>
        <tr><td>row_4</td><td>9</td></tr>
      </table>`;
    codeCell.appendChild(res);
  } else if (cell.type === 'js' && !cell.hideResult) {
    const chart = document.createElement('div');
    chart.className = 'nbd-chart';
    chart.innerHTML = `
      <div class="nbd-bar" style="height:100%"></div>
      <div class="nbd-bar" style="height:68%"></div>
      <div class="nbd-bar" style="height:52%"></div>
      <div class="nbd-bar" style="height:22%"></div>`;
    codeCell.appendChild(chart);
  }

  row.appendChild(codeCell);

  if (cell.comment) {
    const c = document.createElement('div');
    c.className = 'nbd-comment';
    c.innerHTML = `
      <div class="nbd-comment-who">
        <div class="nbd-av-small">${escapeHtml(cell.comment.who.slice(0, 2).toUpperCase())}</div>
        <span class="nbd-who-name">${escapeHtml(cell.comment.who)}</span>
        <span class="nbd-when">${escapeHtml(cell.comment.when)}</span>
      </div>
      <div class="nbd-comment-body">${escapeHtml(cell.comment.body)}</div>`;
    row.appendChild(c);
  }

  (head.querySelector('.nb-toggle-src') as HTMLElement).addEventListener('click', () => { cell.hideSource = !cell.hideSource; rerender(); });
  (head.querySelector('.nb-toggle-res') as HTMLElement).addEventListener('click', () => { cell.hideResult = !cell.hideResult; rerender(); });
  (head.querySelector('.nbd-del') as HTMLElement).addEventListener('click', () =>
    deleteCellWithConfirm(state, cell, (c) => `${c.type} cell`, rerender)
  );

  wrap.appendChild(row);
  return wrap;
}

function escapeHtml(s: string): string {
  return (s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
}
function escapeAttr(s: string): string {
  return (s ?? '').replace(/"/g, '&quot;');
}

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
  font-family: var(--font-sans, 'Syne', sans-serif);
  font-size: 24px; font-weight: 600;
  letter-spacing: -0.02em; margin: 6px 0 2px;
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
  font-size: 15px; line-height: 1.7;
  color: var(--color-text1);
  outline: none;
  padding: 4px 6px;
  border-radius: 3px;
  border: 1px dashed transparent;
}
.nbd-prose:focus { border-color: var(--color-border); background: var(--color-bg); }
.nbd-prose mark {
  background: rgba(240,160,80,0.18);
  color: var(--color-amber);
  padding: 0 4px; border-radius: 2px;
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
  grid-template-columns: 1fr 150px;
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
}
.nbd-result-inline table { width: 100%; border-collapse: collapse; font-size: 11.5px; font-variant-numeric: tabular-nums; }
.nbd-result-inline table td { padding: 3px 0; color: var(--color-text1); }
.nbd-result-inline table td:first-child { color: var(--color-text2); font-variant-numeric: normal; }
.nbd-result-inline table td:last-child { text-align: right; }

.nbd-comment {
  background: rgba(240,160,80,0.08);
  border-left: 2px solid var(--color-amber);
  border-radius: 0 6px 6px 0;
  padding: 10px 12px;
  font-size: 11.5px;
}
.nbd-comment-who { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
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
.nbd-comment-body { color: var(--color-text1); line-height: 1.5; }

.nbd-chart { padding: 16px; display: flex; align-items: flex-end; gap: 10px; height: 95px; }
.nbd-bar { flex: 1; background: var(--color-accent); border-radius: 2px 2px 0 0; }

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
}
.nbd-share-link:hover { color: var(--color-text1); }
`;
  document.head.appendChild(style);
}
