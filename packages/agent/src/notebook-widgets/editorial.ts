// @ts-nocheck
// ---------------------------------------------------------------------------
// notebook-editorial — publication-ready layout (observable-like)
// Serif prose + cells in a single ordered list, all drag-and-droppable together.
// Cells alternate freely: md (prose paragraph) / sql / js cells share the flow.
// ---------------------------------------------------------------------------

import {
  createState, injectStyles, mountRunControls, mountHistoryPanel,
  setupDnD, deleteCellWithConfirm, restoreCellFromSnapshot, addCell,
  autosize, openShareModal, registerHistoryObserver,
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
  const kicker: string = (data.kicker as string) ?? 'untitled';
  const forkId: string = (data.forkId as string) ?? (state.id.slice(0, 4) + '·' + state.id.slice(4, 8));

  container.classList.add('nb-root');
  container.classList.toggle('nb-view-mode', state.mode === 'view');

  container.innerHTML = `
    <div class="nbe-shell">
      <div class="nbe-kicker">
        <span class="nbe-kicker-label">${escapeHtml(kicker)}</span>
        <div class="nb-mode-switch" style="margin-left:auto;">
          <button class="nb-mode-edit nb-on">edit</button>
          <button class="nb-mode-view">view</button>
        </div>
        <button class="nb-btn nbe-history-btn">⟲ history</button>
      </div>
      <input class="nbe-title nb-ed-title" value="${escapeAttr(state.title)}">
      <div class="nb-history-panel nbe-history-panel"></div>
      <div class="nbe-cells"></div>
      <div class="nbe-footer">
        <button class="nb-btn nb-add-cell" data-add="md">+ prose</button>
        <button class="nb-btn nb-add-cell" data-add="sql">+ sql</button>
        <button class="nb-btn nb-add-cell" data-add="js">+ chart</button>
        <span class="nbe-fork nbe-share-btn">share · ${escapeHtml(forkId)}</span>
      </div>
    </div>`;

  const shell = container.querySelector('.nbe-shell') as HTMLElement;
  const cellsEl = shell.querySelector('.nbe-cells') as HTMLElement;
  const historyPanel = shell.querySelector('.nbe-history-panel') as HTMLElement;

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
  (shell.querySelector('.nbe-history-btn') as HTMLElement).addEventListener('click', () => {
    historyPanel.classList.toggle('nb-open');
  });
  (shell.querySelector('.nbe-share-btn') as HTMLElement).addEventListener('click', () => {
    openShareModal(state, (fmt) => console.log('[notebook-editorial] share as', fmt, state));
  });
  (shell.querySelector('.nbe-title') as HTMLInputElement).addEventListener('input', (e) => {
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

  setupDnD(cellsEl, state, rerender);
  const unsubHistory = registerHistoryObserver(() => mountHistoryPanel(historyPanel, state, (snap) => { restoreCellFromSnapshot(state, snap); rerender(); }));

  rerender();
  return () => { unsubHistory(); };
}

// Unified cell rendering: prose (md) and code (sql/js) both live in the same flow.
function renderCell(cell: NotebookCell, state: NotebookState, rerender: () => void): HTMLElement {
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
    const p = document.createElement('div');
    p.className = 'nbe-prose';
    p.contentEditable = 'true';
    p.innerHTML = cell.content;
    p.addEventListener('input', () => { cell.content = p.innerHTML; });
    wrap.appendChild(p);
    return wrap;
  }

  // Code cell: header with run controls FIRST, then code body, then optional output.
  const codeCell = document.createElement('div');
  codeCell.className = 'nb-code-cell nbe-code-cell';

  const head = document.createElement('div');
  head.className = 'nbe-cell-head';
  head.innerHTML = `
    <span class="nbe-run-controls"></span>
    <span class="nbe-type-${cell.type}">${cell.type}</span>
    <span class="nbe-meta-info">${cell.lastMs != null ? cell.lastMs + 'ms' : ''}</span>
    <div class="nbe-actions">
      <button class="nb-icon-btn nb-toggle-src">${cell.hideSource ? '▸ src' : '◂ src'}</button>
      <button class="nb-icon-btn nb-toggle-res">${cell.hideResult ? '▸ res' : '◂ res'}</button>
    </div>`;
  codeCell.appendChild(head);
  mountRunControls(head.querySelector('.nbe-run-controls') as HTMLElement, cell, wrap, rerender);

  const body = document.createElement('div');
  body.className = 'nbe-code-body' + (cell.hideSource ? ' nbe-hidden' : '');
  const ta = document.createElement('textarea');
  ta.className = 'nb-code-edit';
  ta.value = cell.content;
  ta.rows = 1;
  ta.spellcheck = false;
  ta.addEventListener('input', () => { cell.content = ta.value; autosize(ta); cell.status = 'stale'; });
  body.appendChild(ta);
  codeCell.appendChild(body);
  setTimeout(() => autosize(ta), 0);

  if (cell.type === 'js' && !cell.hideResult) {
    const chart = document.createElement('div');
    chart.className = 'nbe-chart';
    chart.innerHTML = `
      <div class="nbe-col"><span class="nbe-val">42</span><div class="nbe-bar" style="height:100%"></div></div>
      <div class="nbe-col"><span class="nbe-val">29</span><div class="nbe-bar" style="height:69%;opacity:.84"></div></div>
      <div class="nbe-col"><span class="nbe-val">22</span><div class="nbe-bar" style="height:53%;opacity:.7"></div></div>
      <div class="nbe-col"><span class="nbe-val">9</span><div class="nbe-bar" style="height:22%;opacity:.56"></div></div>`;
    codeCell.appendChild(chart);
    const axis = document.createElement('div');
    axis.className = 'nbe-chart-axis';
    axis.innerHTML = '<span>A</span><span>B</span><span>C</span><span>D</span>';
    codeCell.appendChild(axis);
  } else if (cell.type === 'sql' && !cell.hideResult) {
    const res = document.createElement('div');
    res.className = 'nbe-sql-result';
    res.innerHTML = `
      <table>
        <tr><td>row_1</td><td>42</td></tr>
        <tr><td>row_2</td><td>29</td></tr>
        <tr><td>row_3</td><td>22</td></tr>
        <tr><td>row_4</td><td>9</td></tr>
      </table>`;
    codeCell.appendChild(res);
  }

  wrap.appendChild(codeCell);

  (head.querySelector('.nb-toggle-src') as HTMLElement).addEventListener('click', () => { cell.hideSource = !cell.hideSource; rerender(); });
  (head.querySelector('.nb-toggle-res') as HTMLElement).addEventListener('click', () => { cell.hideResult = !cell.hideResult; rerender(); });

  return wrap;
}

function escapeHtml(s: string): string {
  return (s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
}
function escapeAttr(s: string): string {
  return (s ?? '').replace(/"/g, '&quot;');
}

function injectLayoutStyles(): void {
  if (document.getElementById('nbe-styles')) return;
  const style = document.createElement('style');
  style.id = 'nbe-styles';
  style.textContent = `
.nbe-shell {
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
.nbe-kicker-label { flex: 0 0 auto; }
.nbe-title {
  font-family: 'EB Garamond', Georgia, serif;
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
  font-family: 'EB Garamond', Georgia, serif;
  font-size: 17px; line-height: 1.7;
  color: var(--color-text1);
  max-width: 620px;
  outline: none;
  padding: 2px 4px;
  border-radius: 3px;
  border: 1px dashed transparent;
}
.nbe-prose:focus { border-color: var(--color-border); background: var(--color-bg); }
.nbe-prose code {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 14px;
  background: var(--color-surface2);
  padding: 1px 6px; border-radius: 3px;
  color: var(--color-accent);
}
.nbe-prose mark {
  background: rgba(240,160,80,0.18);
  color: var(--color-amber);
  padding: 0 4px; border-radius: 2px;
}

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
.nbe-meta-info { margin-right: auto; }
.nbe-actions { display: flex; gap: 4px; }
.nbe-code-body { padding: 14px 16px; }
.nbe-hidden { display: none !important; }

.nbe-sql-result {
  background: var(--color-bg);
  padding: 10px 16px;
  border-top: 1px solid var(--color-border);
}
.nbe-sql-result table {
  width: 100%; border-collapse: collapse;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 12px; font-variant-numeric: tabular-nums;
}
.nbe-sql-result table td { padding: 3px 0; color: var(--color-text1); }
.nbe-sql-result table td:first-child { color: var(--color-text2); }
.nbe-sql-result table td:last-child { text-align: right; }

.nbe-chart {
  display: flex; align-items: flex-end; gap: 14px;
  height: 180px;
  padding: 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}
.nbe-col {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;
  height: 100%; justify-content: flex-end;
}
.nbe-val {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
  font-variant-numeric: tabular-nums;
}
.nbe-bar { width: 100%; background: var(--color-accent); border-radius: 2px 2px 0 0; }
.nbe-chart-axis {
  display: flex; gap: 14px;
  padding: 6px 16px 10px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
  text-transform: uppercase; letter-spacing: 0.08em;
  background: var(--color-bg);
}
.nbe-chart-axis span { flex: 1; text-align: center; }

.nbe-footer {
  display: flex; gap: 8px;
  padding-top: 16px; margin-top: 24px;
  border-top: 1px solid var(--color-border);
  align-items: center;
}
.nbe-fork {
  margin-left: auto;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
  cursor: pointer;
}
.nbe-fork:hover { color: var(--color-accent); }
`;
  document.head.appendChild(style);
}
