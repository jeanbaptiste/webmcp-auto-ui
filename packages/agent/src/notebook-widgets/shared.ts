// @ts-nocheck
// ---------------------------------------------------------------------------
// Notebook shared engine — vanilla JS
// Used by the four notebook layout renderers (compact/workspace/document/editorial)
// ---------------------------------------------------------------------------

export type CellType = 'md' | 'sql' | 'js';
export type RunState = 'idle' | 'running' | 'done' | 'stopped';
export type NotebookMode = 'edit' | 'view';

export interface NotebookCell {
  id: string;
  type: CellType;
  content: string;
  name?: string;           // cell name (workspace/compact)
  varname?: string;        // named output (compact)
  hideSource?: boolean;
  hideResult?: boolean;
  runState?: RunState;
  lastMs?: number;
  status?: 'fresh' | 'stale';
  comment?: { who: string; when: string; body: string } | null;
}

export interface NotebookState {
  id: string;
  title: string;
  mode: NotebookMode;
  cells: NotebookCell[];
  history: HistoryEntry[];
}

export interface HistoryEntry {
  ts: number;
  kind: 'add' | 'del' | 'edit' | 'move' | 'run';
  summary: string;
  snapshot?: { cell: NotebookCell; idx: number };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function uid(): string {
  return 'c_' + Math.random().toString(36).slice(2, 9);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}

export function fmtRelTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 5000) return 'now';
  if (diff < 60000) return Math.floor(diff / 1000) + 's';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  return Math.floor(diff / 3600000) + 'h';
}

export function autosize(ta: HTMLTextAreaElement): void {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

export function defaultCellContent(type: CellType): string {
  if (type === 'md') return '### new section\n\nwrite here…';
  if (type === 'sql') return 'select *\nfrom source\nlimit 10';
  return '// write js here';
}

// ---------------------------------------------------------------------------
// State factory
// ---------------------------------------------------------------------------

export function createState(initial?: Partial<NotebookState>): NotebookState {
  return {
    id: initial?.id ?? uid(),
    title: initial?.title ?? 'Untitled notebook',
    mode: initial?.mode ?? 'edit',
    cells: initial?.cells ?? [
      { id: uid(), type: 'md', content: '### Untitled notebook\n\nAdd some context here.', hideSource: false, hideResult: false },
      { id: uid(), type: 'sql', content: 'select *\nfrom source\nlimit 5', varname: 'rows', hideSource: false, hideResult: false, status: 'fresh' },
      { id: uid(), type: 'js', content: 'console.log(rows)', hideSource: false, hideResult: false, status: 'stale' },
    ],
    history: initial?.history ?? [],
  };
}

export function logHistory(state: NotebookState, kind: HistoryEntry['kind'], summary: string, snapshot?: HistoryEntry['snapshot']): void {
  state.history.unshift({ ts: Date.now(), kind, summary, snapshot: snapshot ? JSON.parse(JSON.stringify(snapshot)) : undefined });
  if (state.history.length > 100) state.history.pop();
}

export function moveCell(state: NotebookState, fromIdx: number, toIdx: number): void {
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
  const [moved] = state.cells.splice(fromIdx, 1);
  state.cells.splice(toIdx, 0, moved);
  logHistory(state, 'move', `moved ${moved.type} cell`);
}

// ---------------------------------------------------------------------------
// Run / Stop live timers
// ---------------------------------------------------------------------------

const runningTimers = new Map<string, { intervalId: any; timeoutId: any }>();

export function startRun(cell: NotebookCell, onUpdate: () => void): void {
  cell.runState = 'running';
  cell.status = 'stale';
  (cell as any).startedAt = Date.now();
  (cell as any).simulatedDuration = 1500 + Math.floor(Math.random() * 1500);
  onUpdate();
}

export function stopRun(cell: NotebookCell, onUpdate: () => void): void {
  const handles = runningTimers.get(cell.id);
  if (handles) {
    clearInterval(handles.intervalId);
    clearTimeout(handles.timeoutId);
    runningTimers.delete(cell.id);
  }
  cell.lastMs = Date.now() - ((cell as any).startedAt || Date.now());
  cell.runState = 'stopped';
  cell.status = 'stale';
  delete (cell as any).startedAt;
  delete (cell as any).simulatedDuration;
  onUpdate();
}

export function tickRunningCell(cell: NotebookCell, elapsedEl: HTMLElement, onDone: () => void): void {
  const startedAt = (cell as any).startedAt || Date.now();
  (cell as any).startedAt = startedAt;
  const tick = () => { elapsedEl.textContent = formatDuration(Date.now() - startedAt); };
  tick();
  const intervalId = setInterval(tick, 50);
  const simulatedDuration = (cell as any).simulatedDuration || 2000;
  const remaining = simulatedDuration - (Date.now() - startedAt);
  const timeoutId = setTimeout(() => {
    if (cell.runState !== 'running') return;
    clearInterval(intervalId);
    cell.lastMs = Date.now() - startedAt;
    cell.runState = 'done';
    cell.status = 'fresh';
    delete (cell as any).startedAt;
    delete (cell as any).simulatedDuration;
    runningTimers.delete(cell.id);
    onDone();
  }, Math.max(0, remaining));
  runningTimers.set(cell.id, { intervalId, timeoutId });
}

// ---------------------------------------------------------------------------
// Modals (shared singletons, created on demand)
// ---------------------------------------------------------------------------

let confirmOverlay: HTMLElement | null = null;
let shareOverlay: HTMLElement | null = null;

function ensureConfirmOverlay(): HTMLElement {
  if (confirmOverlay && document.body.contains(confirmOverlay)) return confirmOverlay;
  confirmOverlay = document.createElement('div');
  confirmOverlay.className = 'nb-confirm-overlay';
  confirmOverlay.innerHTML = `
    <div class="nb-confirm-modal">
      <div class="nb-confirm-title"></div>
      <div class="nb-confirm-msg"></div>
      <div class="nb-confirm-actions">
        <button class="nb-btn nb-btn-cancel">cancel</button>
        <button class="nb-btn nb-btn-danger">delete</button>
      </div>
    </div>`;
  document.body.appendChild(confirmOverlay);
  return confirmOverlay;
}

export function askConfirm(title: string, msg: string, targetName?: string): Promise<boolean> {
  const overlay = ensureConfirmOverlay();
  (overlay.querySelector('.nb-confirm-title') as HTMLElement).textContent = title;
  (overlay.querySelector('.nb-confirm-msg') as HTMLElement).innerHTML =
    msg.replace('{target}', `<span class="nb-target">${targetName || ''}</span>`);
  overlay.classList.add('open');
  return new Promise<boolean>((resolve) => {
    const cleanup = () => { overlay.classList.remove('open'); };
    const onDanger = () => { cleanup(); resolve(true); off(); };
    const onCancel = () => { cleanup(); resolve(false); off(); };
    const onBackdrop = (e: Event) => { if (e.target === overlay) { cleanup(); resolve(false); off(); } };
    const dangerBtn = overlay.querySelector('.nb-btn-danger') as HTMLElement;
    const cancelBtn = overlay.querySelector('.nb-btn-cancel') as HTMLElement;
    const off = () => {
      dangerBtn.removeEventListener('click', onDanger);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onBackdrop);
    };
    dangerBtn.addEventListener('click', onDanger);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onBackdrop);
  });
}

function ensureShareOverlay(): HTMLElement {
  if (shareOverlay && document.body.contains(shareOverlay)) return shareOverlay;
  shareOverlay = document.createElement('div');
  shareOverlay.className = 'nb-share-overlay';
  shareOverlay.innerHTML = `
    <div class="nb-share-modal">
      <div class="nb-share-title">Share notebook</div>
      <div class="nb-share-sub">choose an export format</div>
      <div class="nb-share-options">
        <div class="nb-share-option" data-share="hyperskill">
          <div class="nb-share-icon">HS</div>
          <div class="nb-share-txt">
            <div class="nb-share-name">Hyperskill link</div>
            <div class="nb-share-desc">shareable url with the full state encoded</div>
          </div>
          <span class="nb-share-arrow">→</span>
        </div>
        <div class="nb-share-option" data-share="md">
          <div class="nb-share-icon">MD</div>
          <div class="nb-share-txt">
            <div class="nb-share-name">Markdown</div>
            <div class="nb-share-desc">portable .md with code blocks and prose</div>
          </div>
          <span class="nb-share-arrow">→</span>
        </div>
        <div class="nb-share-option" data-share="png">
          <div class="nb-share-icon">PNG</div>
          <div class="nb-share-txt">
            <div class="nb-share-name">PNG snapshot</div>
            <div class="nb-share-desc">static image of the rendered notebook</div>
          </div>
          <span class="nb-share-arrow">→</span>
        </div>
        <div class="nb-share-option" data-share="json">
          <div class="nb-share-icon">JSON</div>
          <div class="nb-share-txt">
            <div class="nb-share-name">JSON export</div>
            <div class="nb-share-desc">raw cell data for backup or re-import</div>
          </div>
          <span class="nb-share-arrow">→</span>
        </div>
      </div>
      <button class="nb-btn nb-share-close">close</button>
    </div>`;
  document.body.appendChild(shareOverlay);
  shareOverlay.addEventListener('click', (e) => {
    if (e.target === shareOverlay) shareOverlay!.classList.remove('open');
  });
  (shareOverlay.querySelector('.nb-share-close') as HTMLElement).addEventListener('click', () => {
    shareOverlay!.classList.remove('open');
  });
  return shareOverlay;
}

export function openShareModal(state: NotebookState, onFormat: (fmt: string) => void): void {
  const overlay = ensureShareOverlay();
  // Rebind option clicks for the current callback
  overlay.querySelectorAll<HTMLElement>('.nb-share-option').forEach((opt) => {
    const clone = opt.cloneNode(true) as HTMLElement;
    opt.parentNode!.replaceChild(clone, opt);
    clone.addEventListener('click', () => {
      const fmt = clone.dataset.share!;
      onFormat(fmt);
      overlay.classList.remove('open');
    });
  });
  overlay.classList.add('open');
}

// ---------------------------------------------------------------------------
// Styles — injected once per page
// ---------------------------------------------------------------------------

export function injectStyles(): void {
  if (document.getElementById('nb-shared-styles')) return;
  const style = document.createElement('style');
  style.id = 'nb-shared-styles';
  style.textContent = NOTEBOOK_STYLES;
  document.head.appendChild(style);
}

const NOTEBOOK_STYLES = `
.nb-root { font-family: var(--font-sans, 'Syne', system-ui, sans-serif); color: var(--color-text1); }
.nb-root * { box-sizing: border-box; }

.nb-btn {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px;
  color: var(--color-text2);
  background: transparent;
  border: 1px solid var(--color-border);
  padding: 5px 11px;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  letter-spacing: 0.04em;
}
.nb-btn:hover { border-color: var(--color-border2); color: var(--color-text1); }
.nb-btn-primary { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.nb-btn-primary:hover { filter: brightness(1.1); color: #fff; }
.nb-btn-danger { background: var(--color-accent2); color: #fff; border-color: var(--color-accent2); }
.nb-btn-danger:hover { filter: brightness(1.1); color: #fff; }

.nb-icon-btn {
  background: transparent; border: none;
  color: var(--color-text2); cursor: pointer;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; padding: 2px 6px; border-radius: 3px;
}
.nb-icon-btn:hover { color: var(--color-text1); background: var(--color-surface2); }
.nb-icon-btn.nb-danger:hover { color: var(--color-accent2); background: rgba(250,109,124,0.1); }

.nb-ctl-pill {
  width: 22px; height: 22px; border-radius: 50%;
  border: none; cursor: pointer; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; transition: transform 0.1s, filter 0.15s;
  flex-shrink: 0;
}
.nb-ctl-pill:hover { filter: brightness(1.15); }
.nb-ctl-pill:active { transform: scale(0.92); }
.nb-ctl-pill.nb-run { background: var(--color-teal); box-shadow: 0 0 0 1px rgba(62,207,178,0.35), 0 1px 2px rgba(0,0,0,0.25); }
.nb-ctl-pill.nb-stop { background: var(--color-accent2); box-shadow: 0 0 0 1px rgba(250,109,124,0.35), 0 1px 2px rgba(0,0,0,0.25); }
.nb-ctl-pill.nb-run::before {
  content: ''; width: 0; height: 0;
  border-left: 7px solid #fff;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  margin-left: 2px;
}
.nb-ctl-pill.nb-stop::before {
  content: ''; width: 8px; height: 8px; background: #fff; border-radius: 1px;
}

.nb-timer {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10.5px; color: var(--color-text2);
  display: inline-flex; align-items: center; gap: 5px;
  font-variant-numeric: tabular-nums;
}
.nb-timer.nb-running { color: var(--color-teal); }
.nb-timer .nb-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--color-text2); }
.nb-timer.nb-running .nb-dot { background: var(--color-teal); animation: nb-pulse 1s ease-in-out infinite; }
@keyframes nb-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }

.nb-cell-wrapper.nb-running .nb-code-cell,
.nb-cell.nb-running {
  position: relative;
}
.nb-cell-wrapper.nb-running .nb-code-cell::before,
.nb-cell.nb-running::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-teal), transparent);
  background-size: 200% 100%; animation: nb-sweep 1.4s linear infinite; z-index: 1;
}
@keyframes nb-sweep {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.nb-drag-handle {
  cursor: grab; color: var(--color-text2); opacity: 0;
  transition: opacity 0.15s; font-size: 14px; user-select: none; padding: 2px 4px;
}
.nb-cell-wrapper:hover .nb-drag-handle { opacity: 0.5; }
.nb-drag-handle:hover { opacity: 1 !important; color: var(--color-text1); }
.nb-drag-handle:active { cursor: grabbing; }
.nb-cell-wrapper.nb-dragging { opacity: 0.3; }
.nb-cell-wrapper.nb-drag-over-before { box-shadow: 0 -2px 0 var(--color-accent); }
.nb-cell-wrapper.nb-drag-over-after { box-shadow: 0 2px 0 var(--color-accent); }

.nb-root.nb-view-mode .nb-drag-handle,
.nb-root.nb-view-mode .nb-icon-btn.nb-danger,
.nb-root.nb-view-mode .nb-ctl-pill,
.nb-root.nb-view-mode .nb-toggle-src,
.nb-root.nb-view-mode .nb-toggle-res,
.nb-root.nb-view-mode .nb-add-cell { display: none !important; }
.nb-root.nb-view-mode textarea,
.nb-root.nb-view-mode [contenteditable] { pointer-events: none; }
.nb-root.nb-view-mode input.nb-title-edit,
.nb-root.nb-view-mode input.nb-doc-title,
.nb-root.nb-view-mode input.nb-ed-title { pointer-events: none; }

.nb-mode-switch {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: 999px; padding: 2px; background: var(--color-surface);
  margin-right: 4px;
}
.nb-mode-switch button {
  border: none; background: transparent; color: var(--color-text2);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; padding: 4px 10px; cursor: pointer;
  border-radius: 999px; text-transform: uppercase; letter-spacing: 0.08em;
}
.nb-mode-switch button.nb-on { background: var(--color-accent); color: #fff; }

/* History */
.nb-history-panel {
  display: none;
  margin-top: 12px; padding: 12px 14px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  max-height: 240px; overflow-y: auto;
}
.nb-history-panel.nb-open { display: block; }
.nb-history-panel .nb-hp-title {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; color: var(--color-text2);
  text-transform: uppercase; letter-spacing: 0.1em;
  margin-bottom: 10px; display: flex; justify-content: space-between;
}
.nb-history-panel .nb-hp-entry {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 4px; font-size: 12px; border-radius: 4px;
  border-bottom: 1px solid var(--color-border);
}
.nb-history-panel .nb-hp-entry:last-child { border-bottom: none; }
.nb-history-panel .nb-hp-entry .nb-when {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; color: var(--color-text2); min-width: 48px;
}
.nb-history-panel .nb-hp-entry .nb-action { flex: 1; color: var(--color-text1); }
.nb-history-panel .nb-hp-entry .nb-kind {
  display: inline-block; padding: 1px 5px; border-radius: 3px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; margin-right: 6px;
}
.nb-kind-add { background: rgba(62,207,178,0.15); color: var(--color-teal); }
.nb-kind-del { background: rgba(250,109,124,0.15); color: var(--color-accent2); }
.nb-kind-edit { background: rgba(124,109,250,0.15); color: var(--color-accent); }
.nb-kind-move { background: rgba(160,160,184,0.15); color: var(--color-text2); }
.nb-kind-run { background: rgba(240,160,80,0.15); color: var(--color-amber); }
.nb-hp-restore {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; padding: 3px 8px;
  color: var(--color-text2); background: transparent;
  border: 1px solid var(--color-border); border-radius: 4px; cursor: pointer;
}
.nb-hp-restore:hover { color: var(--color-accent); border-color: var(--color-accent); }
.nb-hp-empty { font-size: 12px; color: var(--color-text2); text-align: center; padding: 12px 0; font-style: italic; }

/* Modals */
.nb-confirm-overlay, .nb-share-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: none; align-items: center; justify-content: center;
  z-index: 1001; padding: 24px;
}
.nb-confirm-overlay.open, .nb-share-overlay.open { display: flex; }
.nb-confirm-modal, .nb-share-modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  width: 100%; max-width: 440px;
  padding: 22px;
  font-family: var(--font-sans, 'Syne', sans-serif);
}
.nb-confirm-title, .nb-share-title {
  font-size: 16px; font-weight: 600; margin: 0 0 6px;
}
.nb-confirm-msg {
  font-size: 13px; color: var(--color-text2); line-height: 1.5; margin-bottom: 18px;
}
.nb-target {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 12px; background: var(--color-bg);
  padding: 1px 6px; border-radius: 3px; color: var(--color-accent);
}
.nb-confirm-actions { display: flex; gap: 8px; justify-content: flex-end; }

.nb-share-modal { max-width: 480px; }
.nb-share-sub {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
  letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 20px;
}
.nb-share-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.nb-share-option {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 14px; background: var(--color-bg);
  border: 1px solid var(--color-border); border-radius: 8px;
  cursor: pointer; transition: border-color 0.15s, background 0.15s;
}
.nb-share-option:hover { border-color: var(--color-accent); background: var(--color-surface2); }
.nb-share-icon {
  width: 30px; height: 30px; border-radius: 6px;
  background: var(--color-surface2);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; font-weight: 600; color: var(--color-accent);
  letter-spacing: 0.06em; flex-shrink: 0;
}
.nb-share-name { font-size: 13px; color: var(--color-text1); font-weight: 500; margin-bottom: 1px; }
.nb-share-desc { font-size: 11px; color: var(--color-text2); }
.nb-share-arrow {
  margin-left: auto; color: var(--color-text2);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace); font-size: 14px;
}
.nb-share-option:hover .nb-share-arrow { color: var(--color-accent); }
.nb-share-close {
  width: 100%;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; padding: 8px;
  color: var(--color-text2); background: transparent;
  border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer;
}

/* Edit surfaces */
textarea.nb-code-edit, textarea.nb-md-edit {
  width: 100%; background: transparent; border: none; outline: none;
  color: var(--color-text1);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 12.5px; line-height: 1.65;
  resize: none; padding: 0; overflow: hidden;
}
textarea.nb-md-edit {
  font-family: var(--font-sans, 'Syne', sans-serif) !important;
  font-size: 14px !important; line-height: 1.6 !important;
}
.nb-kw { color: var(--color-accent); }
.nb-str { color: var(--color-teal); }
`;

// ---------------------------------------------------------------------------
// Shared UI parts: Run/Stop control, history panel, drag-drop
// ---------------------------------------------------------------------------

export function mountRunControls(container: HTMLElement, cell: NotebookCell, cellWrap: HTMLElement, rerender: () => void): void {
  container.innerHTML = '';
  const state = cell.runState || 'idle';

  if (state === 'running') {
    const stop = document.createElement('button');
    stop.className = 'nb-ctl-pill nb-stop';
    stop.title = 'stop';
    container.appendChild(stop);

    const timer = document.createElement('span');
    timer.className = 'nb-timer nb-running';
    timer.style.marginLeft = '6px';
    timer.innerHTML = '<span class="nb-dot"></span><span class="nb-elapsed">0ms</span>';
    container.appendChild(timer);

    cellWrap.classList.add('nb-running');
    const wsCell = cellWrap.querySelector?.('.nb-cell');
    if (wsCell) wsCell.classList.add('nb-running');

    tickRunningCell(cell, timer.querySelector('.nb-elapsed') as HTMLElement, rerender);

    stop.addEventListener('click', () => stopRun(cell, rerender));
    return;
  }

  cellWrap.classList.remove('nb-running');
  const wsCell = cellWrap.querySelector?.('.nb-cell');
  if (wsCell) wsCell.classList.remove('nb-running');

  // idle / done / stopped — single green Run button (replay = re-click Run)
  const run = document.createElement('button');
  run.className = 'nb-ctl-pill nb-run';
  run.title = state === 'done' ? 'replay' : state === 'stopped' ? 'stopped · run again' : 'run';
  run.addEventListener('click', () => startRun(cell, rerender));
  container.appendChild(run);

  if (cell.lastMs != null && state !== 'idle') {
    const tag = document.createElement('span');
    tag.className = 'nb-timer';
    tag.style.marginLeft = '6px';
    const dotColor = state === 'stopped' ? 'var(--color-accent2)' : 'var(--color-text2)';
    const label = state === 'stopped' ? 'stopped' : 'last run';
    tag.innerHTML = `<span class="nb-dot" style="background:${dotColor};"></span><span>${label} · ${formatDuration(cell.lastMs)}</span>`;
    container.appendChild(tag);
  }
}

export function mountHistoryPanel(
  panelEl: HTMLElement,
  state: NotebookState,
  onRestore: (snap: { cell: NotebookCell; idx: number }) => void
): void {
  const entries = state.history;
  panelEl.innerHTML = `
    <div class="nb-hp-title">
      <span>history · ${entries.length} action${entries.length !== 1 ? 's' : ''}</span>
      <span>↻ restores state</span>
    </div>
    ${entries.length === 0
      ? '<div class="nb-hp-empty">no actions yet — edit, add, or delete cells</div>'
      : entries.map((h, idx) => `
        <div class="nb-hp-entry" data-idx="${idx}">
          <span class="nb-when">${fmtRelTime(h.ts)}</span>
          <span class="nb-action"><span class="nb-kind nb-kind-${h.kind}">${h.kind}</span>${escapeHtml(h.summary)}</span>
          ${h.snapshot ? '<button class="nb-hp-restore">restore</button>' : ''}
        </div>`).join('')
    }`;
  panelEl.querySelectorAll<HTMLElement>('.nb-hp-restore').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.closest('.nb-hp-entry')!.getAttribute('data-idx')!, 10);
      const snap = entries[idx].snapshot;
      if (snap) onRestore(snap);
    });
  });
}

export function setupDnD(container: HTMLElement, state: NotebookState, rerender: () => void): void {
  let draggedId: string | null = null;
  container.addEventListener('dragstart', (e) => {
    const handle = (e.target as HTMLElement).closest('.nb-drag-handle');
    if (!handle) { e.preventDefault(); return; }
    const wrap = handle.closest('.nb-cell-wrapper') as HTMLElement;
    draggedId = wrap.dataset.id!;
    wrap.classList.add('nb-dragging');
    e.dataTransfer!.effectAllowed = 'move';
  });
  container.addEventListener('dragend', () => {
    container.querySelectorAll('.nb-cell-wrapper').forEach((w) => {
      w.classList.remove('nb-dragging', 'nb-drag-over-before', 'nb-drag-over-after');
    });
    draggedId = null;
  });
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const wrap = (e.target as HTMLElement).closest('.nb-cell-wrapper') as HTMLElement | null;
    container.querySelectorAll('.nb-cell-wrapper').forEach((w) => {
      w.classList.remove('nb-drag-over-before', 'nb-drag-over-after');
    });
    if (!wrap || wrap.dataset.id === draggedId) return;
    const rect = wrap.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    wrap.classList.add(before ? 'nb-drag-over-before' : 'nb-drag-over-after');
  });
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    const wrap = (e.target as HTMLElement).closest('.nb-cell-wrapper') as HTMLElement | null;
    if (!wrap || !draggedId || wrap.dataset.id === draggedId) return;
    const fromIdx = state.cells.findIndex((c) => c.id === draggedId);
    let toIdx = state.cells.findIndex((c) => c.id === wrap.dataset.id);
    const rect = wrap.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    if (!before) toIdx++;
    if (fromIdx < toIdx) toIdx--;
    moveCell(state, fromIdx, toIdx);
    rerender();
  });
}

// ---------------------------------------------------------------------------
// Helpers for action handlers
// ---------------------------------------------------------------------------

export async function deleteCellWithConfirm(
  state: NotebookState,
  cell: NotebookCell,
  describe: (c: NotebookCell) => string,
  rerender: () => void
): Promise<void> {
  const targetName = describe(cell);
  const ok = await askConfirm(
    'Delete cell?',
    'Remove {target} from the notebook? You can restore it later from the history panel.',
    targetName
  );
  if (!ok) return;
  const idx = state.cells.findIndex((c) => c.id === cell.id);
  if (idx < 0) return;
  const removed = state.cells.splice(idx, 1)[0];
  logHistory(state, 'del', `removed ${targetName}`, { cell: removed, idx });
  rerender();
}

export function restoreCellFromSnapshot(state: NotebookState, snapshot: { cell: NotebookCell; idx: number }): void {
  const insertAt = Math.min(snapshot.idx, state.cells.length);
  state.cells.splice(insertAt, 0, snapshot.cell);
  logHistory(state, 'add', `restored ${snapshot.cell.type} cell`);
}

export function addCell(state: NotebookState, type: CellType, opts?: Partial<NotebookCell>): NotebookCell {
  const cell: NotebookCell = {
    id: uid(),
    type,
    content: opts?.content ?? defaultCellContent(type),
    hideSource: false,
    hideResult: false,
    status: 'stale',
    ...(opts || {}),
  };
  state.cells.push(cell);
  logHistory(state, 'add', `added ${type} cell`);
  return cell;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
}

// ---------------------------------------------------------------------------
// Keep history timestamps fresh across all notebooks
// ---------------------------------------------------------------------------

const historyObservers = new Set<() => void>();
export function registerHistoryObserver(fn: () => void): () => void {
  historyObservers.add(fn);
  return () => historyObservers.delete(fn);
}
setInterval(() => { historyObservers.forEach((fn) => fn()); }, 15000);
