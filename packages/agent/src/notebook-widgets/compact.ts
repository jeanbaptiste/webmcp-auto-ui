// @ts-nocheck
// ---------------------------------------------------------------------------
// notebook-compact — reactive minimalist layout (marimo-like)
// Left gutter with type label + vertical line, named outputs, fresh/stale status.
// ---------------------------------------------------------------------------

import {
  createState, injectStyles, mountRunControls, mountHistoryPanel,
  setupDnD, deleteCellWithConfirm, restoreCellFromSnapshot, addCell,
  logHistory, autosize, openShareModal, registerHistoryObserver,
  buildServersButton,
  type NotebookState, type NotebookCell,
} from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  injectStyles();
  injectLayoutStyles();

  const state: NotebookState = createState({
    id: data.id as string,
    title: data.title as string,
    mode: (data.mode as any) ?? 'edit',
    cells: data.cells as any,
  });

  container.classList.add('nb-root');
  container.classList.toggle('nb-view-mode', state.mode === 'view');

  container.innerHTML = `
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
          <button class="nb-btn nb-add-cell" data-add="md">+ md</button>
          <button class="nb-btn nb-add-cell" data-add="sql">+ sql</button>
          <button class="nb-btn nb-add-cell" data-add="js">+ js</button>
          <button class="nb-btn nbc-history-btn">⟲ history</button>
          <span class="nbc-servers-slot"></span>
          <button class="nb-btn nbc-share-btn">share</button>
        </div>
      </div>
      <div class="nb-history-panel nbc-history-panel"></div>
      <div class="nbc-cells"></div>
    </div>`;

  const shell = container.querySelector('.nbc-shell') as HTMLElement;
  const cellsEl = shell.querySelector('.nbc-cells') as HTMLElement;
  const historyPanel = shell.querySelector('.nbc-history-panel') as HTMLElement;

  function renderCells() {
    cellsEl.innerHTML = '';
    state.cells.forEach((cell) => cellsEl.appendChild(renderCell(cell, state, rerender)));
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

  // Toolbar bindings
  shell.querySelectorAll<HTMLElement>('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.add as any;
      addCell(state, type, { varname: type === 'sql' ? 'rows_' + (state.cells.length + 1) : undefined });
      rerender();
    });
  });
  (shell.querySelector('.nbc-history-btn') as HTMLElement).addEventListener('click', () => {
    historyPanel.classList.toggle('nb-open');
  });
  (shell.querySelector('.nbc-share-btn') as HTMLElement).addEventListener('click', () => {
    openShareModal(state, (fmt) => console.log('[notebook-compact] share as', fmt, state));
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

  buildServersButton(state, shell.querySelector('.nbc-servers-slot') as HTMLElement, data, rerender);

  setupDnD(cellsEl, state, rerender);
  const unsubHistory = registerHistoryObserver(() => mountHistoryPanel(historyPanel, state, (snap) => { restoreCellFromSnapshot(state, snap); rerender(); }));

  rerender();

  return () => { unsubHistory(); };
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
  gutter.innerHTML = `<span class="nbc-type-label">${cell.type}</span><span class="nbc-line"></span>`;
  row.appendChild(gutter);

  const body = document.createElement('div');
  body.className = 'nbc-body';
  body.style.minWidth = '0';

  if (cell.type === 'md') {
    const mdBody = document.createElement('div');
    mdBody.className = 'nbc-md-body';
    const ta = document.createElement('textarea');
    ta.className = 'nb-md-edit';
    ta.value = cell.content;
    ta.rows = 2;
    ta.placeholder = 'write markdown…';
    ta.addEventListener('input', () => { cell.content = ta.value; autosize(ta); });
    mdBody.appendChild(ta);
    body.appendChild(mdBody);
    setTimeout(() => autosize(ta), 0);

    const del = document.createElement('button');
    del.className = 'nb-icon-btn nb-danger nbc-md-del';
    del.textContent = '✕';
    del.title = 'delete cell';
    del.addEventListener('click', () => deleteCellWithConfirm(state, cell, (c) => 'markdown cell', rerender));
    wrap.appendChild(del);
  } else {
    const codeCell = document.createElement('div');
    codeCell.className = 'nb-code-cell nbc-code-cell';

    // Cell title row with run controls FIRST (left), then meta
    const titleRow = document.createElement('div');
    titleRow.className = 'nbc-title-row';
    titleRow.innerHTML = `
      <span class="nbc-run-controls"></span>
      ${cell.varname ? `<span class="nbc-arrow-var">→ ${cell.varname}</span>` : ''}
      <span class="nbc-meta-info">${cell.type === 'sql' ? '4 rows' : 'depends on rows'}</span>
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
    ta.addEventListener('input', () => { cell.content = ta.value; autosize(ta); cell.status = 'stale'; });
    codeBody.appendChild(ta);
    codeCell.appendChild(codeBody);
    setTimeout(() => autosize(ta), 0);

    const result = document.createElement('div');
    result.className = 'nbc-result-body' + (cell.hideResult ? ' nbc-hidden' : '');
    if (cell.type === 'sql') {
      result.innerHTML = `
        <div class="nbc-result-row">
          <span>row_1</span><span>42</span>
          <span>row_2</span><span>17</span>
          <span>row_3</span><span>8</span>
          <span>row_4</span><span>3</span>
        </div>`;
    } else {
      result.className = 'nbc-chart-result' + (cell.hideResult ? ' nbc-hidden' : '');
      result.innerHTML = `
        <div class="nbc-bar" style="height:100%"></div>
        <div class="nbc-bar" style="height:68%"></div>
        <div class="nbc-bar" style="height:52%"></div>
        <div class="nbc-bar" style="height:22%"></div>`;
    }
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
  return wrap;
}

// ---------------------------------------------------------------------------
// Layout-specific styles
// ---------------------------------------------------------------------------

function injectLayoutStyles(): void {
  if (document.getElementById('nbc-styles')) return;
  const style = document.createElement('style');
  style.id = 'nbc-styles';
  style.textContent = `
.nbc-shell {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 12px; padding: 18px;
}
.nbc-toolbar {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
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
.nbc-actions { display: flex; gap: 6px; align-items: center; }
.nbc-history-panel { margin-bottom: 12px; }

.nbc-cell { margin-bottom: 14px; position: relative; }
.nbc-cell:last-child { margin-bottom: 0; }
.nbc-row {
  display: grid; grid-template-columns: 20px 34px 1fr; gap: 6px;
}
.nbc-gutter {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.nbc-type-label {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; letter-spacing: 0.12em; color: var(--color-text2);
}
.nbc-gutter-sql .nbc-type-label { color: var(--color-accent); }
.nbc-gutter-js .nbc-type-label { color: var(--color-teal); }
.nbc-line { width: 1px; flex: 1; background: var(--color-border); }
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
}
.nbc-result-row {
  display: grid; grid-template-columns: 1fr auto; gap: 3px 24px;
  color: var(--color-text2);
}
.nbc-result-row span:nth-child(even) {
  color: var(--color-text1); font-variant-numeric: tabular-nums;
}
.nbc-chart-result {
  padding: 14px; display: flex; align-items: flex-end; gap: 6px;
  height: 92px; border-top: 1px solid var(--color-border);
}
.nbc-bar { flex: 1; background: var(--color-accent); border-radius: 2px 2px 0 0; opacity: 0.55; }
`;
  document.head.appendChild(style);
}
