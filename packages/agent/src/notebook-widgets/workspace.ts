// @ts-nocheck
// ---------------------------------------------------------------------------
// notebook-workspace — dense analyst workspace (hex-like)
// Header bar + sidebar (sources + cells nav) + main cells area.
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
  let activeCellId: string | null = state.cells.find((c) => c.type !== 'md')?.id ?? state.cells[0]?.id ?? null;

  container.classList.add('nb-root');
  container.classList.toggle('nb-view-mode', state.mode === 'view');

  container.innerHTML = `
    <div class="nbw-shell">
      <div class="nbw-header">
        <div class="nbw-logo"></div>
        <input class="nbw-title-edit nb-title-edit" value="${escapeAttr(state.title)}">
        <span class="nbw-tag">draft</span>
        <div class="nbw-ctx">
          <span class="nbw-source">no source connected</span>
          <div class="nb-mode-switch">
            <button class="nb-mode-edit nb-on">edit</button>
            <button class="nb-mode-view">view</button>
          </div>
          <button class="nb-btn nbw-history-btn">⟲ history</button>
          <span class="nbw-servers-slot"></span>
          <button class="nb-btn">run all</button>
          <button class="nb-btn nbw-share-btn">share</button>
          <button class="nb-btn nb-btn-primary">publish</button>
        </div>
      </div>
      <div class="nb-history-panel nbw-history-panel"></div>
      <div class="nbw-body">
        <aside class="nbw-sidebar">
          <div class="nbw-section">sources</div>
          <div class="nbw-item">◉ no source</div>
          <div class="nbw-item nbw-indent nbw-dim">connect via mcp…</div>
          <div class="nbw-section">cells</div>
          <div class="nbw-cells-nav"></div>
          <div class="nbw-add">
            <button class="nb-btn nb-add-cell" data-add="md">+ md</button>
            <button class="nb-btn nb-add-cell" data-add="sql">+ sql</button>
            <button class="nb-btn nb-add-cell" data-add="js">+ js</button>
          </div>
        </aside>
        <div class="nbw-cells"></div>
      </div>
    </div>`;

  const shell = container.querySelector('.nbw-shell') as HTMLElement;
  const cellsEl = shell.querySelector('.nbw-cells') as HTMLElement;
  const navEl = shell.querySelector('.nbw-cells-nav') as HTMLElement;
  const historyPanel = shell.querySelector('.nbw-history-panel') as HTMLElement;

  function renderCells() {
    cellsEl.innerHTML = '';
    navEl.innerHTML = '';
    state.cells.forEach((cell, idx) => {
      const navItem = document.createElement('div');
      navItem.className = 'nbw-item' + (cell.id === activeCellId ? ' nbw-active' : '');
      navItem.textContent = `${idx + 1} · ${cell.name || cell.type}`;
      navItem.addEventListener('click', () => { activeCellId = cell.id; rerender(); });
      navEl.appendChild(navItem);

      cellsEl.appendChild(renderCell(cell, idx, state, rerender));
    });
  }

  function rerender() {
    mountHistoryPanel(historyPanel, state, (snap) => { restoreCellFromSnapshot(state, snap); rerender(); });
    renderCells();
  }

  shell.querySelectorAll<HTMLElement>('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.add as any;
      const name = type === 'md' ? 'note' : type === 'sql' ? 'query_' + (state.cells.length + 1) : 'cell_' + (state.cells.length + 1);
      const cell = addCell(state, type, { name });
      activeCellId = cell.id;
      rerender();
    });
  });
  (shell.querySelector('.nbw-history-btn') as HTMLElement).addEventListener('click', () => {
    historyPanel.classList.toggle('nb-open');
  });
  (shell.querySelector('.nbw-share-btn') as HTMLElement).addEventListener('click', () => {
    openShareModal(state, (fmt) => console.log('[notebook-workspace] share as', fmt, state));
  });
  (shell.querySelector('.nbw-title-edit') as HTMLInputElement).addEventListener('input', (e) => {
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

  buildServersButton(state, shell.querySelector('.nbw-servers-slot') as HTMLElement, data, rerender);

  setupDnD(cellsEl, state, rerender);
  const unsubHistory = registerHistoryObserver(() => mountHistoryPanel(historyPanel, state, (snap) => { restoreCellFromSnapshot(state, snap); rerender(); }));

  rerender();
  return () => { unsubHistory(); };
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
  head.innerHTML = `
    <span class="nb-drag-handle" draggable="true" title="drag">⋮⋮</span>
    ${isCode ? '<span class="nbw-run-controls"></span>' : ''}
    <span class="nbw-type nbw-type-${cell.type}">${cell.type}</span>
    <input class="nbw-cell-name-edit" value="${idx + 1} · ${escapeAttr(cell.name || '')}">
    <div class="nbw-meta">
      ${isCode ? `<span class="nbw-meta-info">${cell.lastMs != null ? cell.lastMs + 'ms' : '—'} · 4 rows</span>` : ''}
      <button class="nb-icon-btn nb-toggle-src">${cell.hideSource ? '▸ src' : '◂ src'}</button>
      ${isCode ? `<button class="nb-icon-btn nb-toggle-res">${cell.hideResult ? '▸ res' : '◂ res'}</button>` : ''}
      <button class="nb-icon-btn nb-danger nbw-del">✕</button>
    </div>`;
  inner.appendChild(head);

  if (isCode) {
    mountRunControls(head.querySelector('.nbw-run-controls') as HTMLElement, cell, wrap, rerender);
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

  if (cell.type === 'sql' && !cell.hideResult) {
    const resWrap = document.createElement('div');
    resWrap.innerHTML = `
      <table class="nbw-result-table">
        <thead><tr><th>col_a</th><th>col_b</th><th>share</th></tr></thead>
        <tbody>
          <tr><td>row_1</td><td>42</td><td><div class="nbw-share-bar" style="width:100%"></div></td></tr>
          <tr><td>row_2</td><td>29</td><td><div class="nbw-share-bar" style="width:69%"></div></td></tr>
          <tr><td>row_3</td><td>22</td><td><div class="nbw-share-bar" style="width:52%"></div></td></tr>
          <tr><td>row_4</td><td>9</td><td><div class="nbw-share-bar" style="width:22%"></div></td></tr>
        </tbody>
      </table>`;
    inner.appendChild(resWrap);
  } else if (cell.type === 'js' && !cell.hideResult) {
    const chart = document.createElement('div');
    chart.className = 'nbw-chart';
    chart.innerHTML = `
      <div class="nbw-bar" style="height:100%"></div>
      <div class="nbw-bar" style="height:68%"></div>
      <div class="nbw-bar" style="height:52%"></div>
      <div class="nbw-bar" style="height:22%"></div>`;
    inner.appendChild(chart);
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
  border-radius: 12px; overflow: hidden;
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
.nbw-tag {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; color: var(--color-text2);
  background: var(--color-bg); padding: 2px 7px; border-radius: 3px;
  border: 1px solid var(--color-border);
}
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
}
.nbw-item:hover { background: var(--color-surface); color: var(--color-text1); }
.nbw-item.nbw-indent { padding-left: 18px; }
.nbw-item.nbw-dim { opacity: 0.5; }
.nbw-item.nbw-active {
  background: var(--color-surface); color: var(--color-text1);
  border-left: 2px solid var(--color-accent); border-radius: 0 4px 4px 0;
}
.nbw-add { margin-top: 10px; display: flex; gap: 4px; flex-wrap: wrap; }
.nbw-add .nb-btn { flex: 1; font-size: 10px; padding: 3px 4px; }

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

.nbw-chart { padding: 16px; display: flex; align-items: flex-end; gap: 10px; height: 110px; }
.nbw-bar { flex: 1; background: var(--color-accent); border-radius: 2px 2px 0 0; }
`;
  document.head.appendChild(style);
}
