// @ts-nocheck
// ---------------------------------------------------------------------------
// Notebook shared engine — vanilla JS
// Used by the four notebook layout renderers (compact/workspace/document/editorial)
// ---------------------------------------------------------------------------

export const NB_PUBLISH_HOST: string = (() => {
  try {
    const override = (import.meta as any)?.env?.PUBLIC_NB_HOST;
    if (override && typeof override === 'string') return String(override);
  } catch { /* ignore */ }
  return 'https://nb.hyperskills.net';
})();

export type CellType = 'md' | 'sql' | 'js';
export type RunState = 'idle' | 'running' | 'done' | 'stopped';
export type NotebookMode = 'edit' | 'view';

// ---------------------------------------------------------------------------
// Cell result — tagged union consumed by all 4 widgets
// ---------------------------------------------------------------------------
export type CellResult =
  | { ok: true; kind: 'table'; rows: Record<string, unknown>[]; columns: string[]; rowCount: number; truncated?: boolean; durationMs: number; logs?: string[] }
  | { ok: true; kind: 'value'; value: unknown; durationMs: number; logs?: string[] }
  | { ok: true; kind: 'chart'; spec: unknown; durationMs: number; logs?: string[] }
  | { ok: true; kind: 'empty'; durationMs: number; logs?: string[] }
  | { ok: false; error: string; errorKind?: 'syntax' | 'runtime' | 'timeout' | 'schema'; durationMs: number; logs?: string[] };

export interface CellExecContext {
  cell: NotebookCell;
  state: NotebookState;
  scope: Record<string, unknown>;
  signal: AbortSignal;
}

export type CellExecutor = (ctx: CellExecContext) => Promise<CellResult>;
export type CellExecutors = Partial<Record<CellType, CellExecutor>>;

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
  lastResult?: CellResult;
}

export interface NotebookState {
  id: string;
  title: string;
  mode: NotebookMode;
  cells: NotebookCell[];
  history: HistoryEntry[];
  scope: Record<string, unknown>;
  executors: CellExecutors;
  lastEditAt: number;
  kicker?: string;
  publishedSlug?: string;
  publishedToken?: string;
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
    scope: initial?.scope ?? {},
    executors: initial?.executors ?? {},
    lastEditAt: initial?.lastEditAt ?? Date.now(),
    kicker: initial?.kicker,
  };
}

export function registerExecutor(state: NotebookState, type: CellType, fn: CellExecutor): void {
  state.executors[type] = fn;
}

/**
 * Insert imported cells into the notebook at a given position.
 * - position undefined/null → end of notebook
 * - position index → inserted just after that index
 * Adds history entries and updates lastEditAt.
 */
export function addImportedCells(state: NotebookState, cells: NotebookCell[], position?: number | null): void {
  if (!cells?.length) return;
  const insertAt = (typeof position === 'number' && position >= -1)
    ? Math.min(Math.max(position + 1, 0), state.cells.length)
    : state.cells.length;
  state.cells.splice(insertAt, 0, ...cells);
  for (const c of cells) {
    logHistory(state, 'add', `added ${c.type} cell (import)`);
  }
}

/**
 * Mark downstream cells stale when a varname is updated.
 * Simple lexical match: any cell whose content references \bvarname\b is marked stale.
 */
export function propagateStale(state: NotebookState, varname: string): void {
  if (!varname) return;
  const re = new RegExp('\\b' + varname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
  for (const c of state.cells) {
    if (c.type === 'md') continue;
    if (re.test(c.content)) c.status = 'stale';
  }
}

export function logHistory(state: NotebookState, kind: HistoryEntry['kind'], summary: string, snapshot?: HistoryEntry['snapshot']): void {
  state.history.unshift({ ts: Date.now(), kind, summary, snapshot: snapshot ? JSON.parse(JSON.stringify(snapshot)) : undefined });
  if (state.history.length > 100) state.history.pop();
  state.lastEditAt = Date.now();
}

export function moveCell(state: NotebookState, fromIdx: number, toIdx: number): void {
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
  const [moved] = state.cells.splice(fromIdx, 1);
  state.cells.splice(toIdx, 0, moved);
  logHistory(state, 'move', `moved ${moved.type} cell`);
}

// ---------------------------------------------------------------------------
// Run / Stop — dispatcher with pluggable executors, timer-mock fallback
// ---------------------------------------------------------------------------

const runningTimers = new Map<string, { intervalId: any; timeoutId: any }>();
const runningAborts = new Map<string, AbortController>();

/**
 * Start running a cell. If state has a registered executor for cell.type,
 * run it and store CellResult on the cell. Otherwise fall back to the legacy
 * mock timer (keeps the UI alive while phase 1 wires real executors).
 */
export function startRun(cell: NotebookCell, state: NotebookState | null, onUpdate: () => void): void {
  cell.runState = 'running';
  cell.status = 'stale';
  (cell as any).startedAt = Date.now();
  onUpdate();

  const exec = state?.executors?.[cell.type];
  if (exec) {
    const ac = new AbortController();
    runningAborts.set(cell.id, ac);
    const ctx: CellExecContext = { cell, state: state!, scope: state!.scope, signal: ac.signal };
    const startedAt = (cell as any).startedAt as number;
    exec(ctx).then((res) => {
      if (cell.runState !== 'running') return;
      cell.lastResult = res;
      cell.lastMs = res.durationMs ?? (Date.now() - startedAt);
      cell.runState = 'done';
      cell.status = res.ok ? 'fresh' : 'stale';
      runningAborts.delete(cell.id);
      if (res.ok && cell.varname && state) {
        state.scope[cell.varname] = pickScopeValue(res);
        propagateStale(state, cell.varname);
        // Current cell is fresh (just ran), keep it fresh
        cell.status = 'fresh';
      }
      delete (cell as any).startedAt;
      onUpdate();
    }).catch((err) => {
      if (cell.runState !== 'running') return;
      cell.lastResult = { ok: false, error: String(err?.message ?? err), errorKind: 'runtime', durationMs: Date.now() - startedAt };
      cell.lastMs = Date.now() - startedAt;
      cell.runState = 'done';
      cell.status = 'stale';
      runningAborts.delete(cell.id);
      delete (cell as any).startedAt;
      onUpdate();
    });
    return;
  }

  // Legacy mock timer — kept so widgets still animate before exec engines are wired
  (cell as any).simulatedDuration = 1500 + Math.floor(Math.random() * 1500);
}

function pickScopeValue(res: CellResult): unknown {
  if (!res.ok) return undefined;
  if (res.kind === 'table') return res.rows;
  if (res.kind === 'value') return res.value;
  if (res.kind === 'chart') return res.spec;
  return undefined;
}

export function stopRun(cell: NotebookCell, onUpdate: () => void): void {
  const handles = runningTimers.get(cell.id);
  if (handles) {
    clearInterval(handles.intervalId);
    clearTimeout(handles.timeoutId);
    runningTimers.delete(cell.id);
  }
  const ac = runningAborts.get(cell.id);
  if (ac) {
    ac.abort();
    runningAborts.delete(cell.id);
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
  // If an executor is running, we don't use the mock timeout — the promise resolve drives onDone.
  // Only set a timeout for the legacy mock path.
  const simulatedDuration = (cell as any).simulatedDuration;
  if (simulatedDuration) {
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
  } else {
    // Real executor path: only keep the interval for elapsed display;
    // clear it when the cell transitions out of 'running'.
    runningTimers.set(cell.id, { intervalId, timeoutId: null as any });
    const pollOut = setInterval(() => {
      if (cell.runState !== 'running') {
        clearInterval(intervalId);
        clearInterval(pollOut);
        runningTimers.delete(cell.id);
        onDone();
      }
    }, 100);
  }
}

// ---------------------------------------------------------------------------
// Data server descriptors (merged from canvas store + recipe-provided data.servers)
// ---------------------------------------------------------------------------

export interface DataServerTool {
  name: string;
  description?: string;
}

export interface DataServerRecipe {
  name: string;
  description?: string;
}

export interface DataServerDescriptor {
  name: string;
  url?: string;
  kind?: string;
  tools?: DataServerTool[];
  recipes?: DataServerRecipe[];
}

/** Return true when the server looks like a UI/webmcp server and should be hidden. */
function isUiServer(name: string, kind?: string): boolean {
  if (kind === 'ui' || kind === 'webmcp') return true;
  const n = (name || '').toLowerCase();
  return n.includes('autoui') || n.includes('webmcp');
}

/**
 * Merge data servers from two sources:
 *  - live canvas store snapshot (single connected MCP server)
 *  - recipe-provided `data.servers` (richer objects with recipes/tools)
 * Dedupes by `name`, prioritizing recipe entries for metadata.
 */
export function collectDataServers(data: Record<string, unknown>): DataServerDescriptor[] {
  const out: DataServerDescriptor[] = [];
  const seen = new Map<string, number>();

  const push = (srv: DataServerDescriptor) => {
    if (!srv || !srv.name) return;
    if (isUiServer(srv.name, srv.kind)) return;
    const idx = seen.get(srv.name);
    if (idx == null) {
      seen.set(srv.name, out.length);
      out.push(srv);
    } else {
      // merge metadata (existing has precedence, but fill missing from new)
      const existing = out[idx];
      if (!existing.url && srv.url) existing.url = srv.url;
      if (!existing.kind && srv.kind) existing.kind = srv.kind;
      if ((!existing.tools || !existing.tools.length) && srv.tools) existing.tools = srv.tools;
      if ((!existing.recipes || !existing.recipes.length) && srv.recipes) existing.recipes = srv.recipes;
    }
  };

  // 1. recipe-provided servers (priority)
  const raw = Array.isArray(data?.servers) ? (data.servers as any[]) : [];
  raw.forEach((s) => {
    if (!s || typeof s !== 'object') return;
    push({
      name: String(s.name ?? ''),
      url: s.url ? String(s.url) : undefined,
      kind: s.kind ? String(s.kind) : undefined,
      tools: Array.isArray(s.tools) ? s.tools.map((t: any) => typeof t === 'string' ? { name: t } : { name: String(t?.name ?? ''), description: t?.description }) : undefined,
      recipes: Array.isArray(s.recipes) ? s.recipes.map((r: any) => typeof r === 'string' ? { name: r } : { name: String(r?.name ?? ''), description: r?.description }) : undefined,
    });
  });

  // 2. live canvas store (single connected server)
  try {
    // Dynamic import fallback: access via global if available; we don't want to hard-bind
    // to a specific store import path here to keep shared.ts framework-agnostic.
    // The SDK's canvasVanilla is a singleton; apps that inject it expose it as window.__canvasVanilla.
    const canvasAny: any = (globalThis as any).__canvasVanilla || (globalThis as any).canvasVanilla;
    const snap = canvasAny?.getSnapshot?.();
    if (snap && snap.mcpConnected && snap.mcpName) {
      push({
        name: String(snap.mcpName),
        url: snap.mcpUrl ? String(snap.mcpUrl) : undefined,
        tools: Array.isArray(snap.mcpTools)
          ? snap.mcpTools.map((t: any) => ({ name: String(t?.name ?? ''), description: t?.description }))
          : undefined,
      });
    }
  } catch { /* ignore */ }

  return out;
}

// ---------------------------------------------------------------------------
// "Data servers" modal — lists servers, recipes, tools; inserts cells on click
// ---------------------------------------------------------------------------

let serversOverlay: HTMLElement | null = null;

function ensureServersOverlay(): HTMLElement {
  if (serversOverlay && document.body.contains(serversOverlay)) return serversOverlay;
  serversOverlay = document.createElement('div');
  serversOverlay.className = 'nbs-overlay';
  serversOverlay.innerHTML = `
    <div class="nbs-modal">
      <div class="nbs-header">
        <div class="nbs-title">Data servers</div>
        <button class="nbs-close" title="close">×</button>
      </div>
      <div class="nbs-body"></div>
    </div>`;
  document.body.appendChild(serversOverlay);
  serversOverlay.addEventListener('click', (e) => {
    if (e.target === serversOverlay) serversOverlay!.classList.remove('open');
  });
  (serversOverlay.querySelector('.nbs-close') as HTMLElement).addEventListener('click', () => {
    serversOverlay!.classList.remove('open');
  });
  return serversOverlay;
}

function looksLikeSqlTool(name: string): boolean {
  const n = name.toLowerCase();
  return n === 'query_sql' || n === 'list_tables' || n === 'describe_table'
      || n.endsWith('_query_sql') || n.endsWith('_list_tables') || n.endsWith('_describe_table')
      || n.includes('query_sql') || n.includes('list_tables') || n.includes('describe_table');
}

function openServersModal(
  servers: DataServerDescriptor[],
  onInsertCell: (type: CellType, content: string) => void,
  onConnectNew?: () => void
): void {
  const overlay = ensureServersOverlay();
  (overlay.querySelector('.nbs-title') as HTMLElement).textContent = `Data servers (${servers.length})`;
  const body = overlay.querySelector('.nbs-body') as HTMLElement;

  const connectBtnHtml = onConnectNew
    ? `<button class="nb-btn nbs-connect-trigger" type="button">+ Connect new server</button>`
    : '';

  if (servers.length === 0) {
    body.innerHTML = `${connectBtnHtml}<div class="nbs-empty">No data MCP server connected.</div>`;
  } else {
    body.innerHTML = connectBtnHtml + servers.map((srv, sidx) => {
      const recipes = srv.recipes || [];
      const tools = srv.tools || [];
      const recipesHtml = recipes.length > 0
        ? recipes.map((r, ri) => `
          <div class="nbs-item" data-kind="recipe" data-srv="${sidx}" data-i="${ri}">
            <span class="nbs-item-icon">📜</span>
            <span class="nbs-item-name">${escapeHtml(r.name)}</span>
            ${r.description ? `<span class="nbs-item-desc">${escapeHtml(r.description)}</span>` : ''}
          </div>`).join('')
        : '<div class="nbs-empty-sub">Recipes unavailable</div>';
      const toolsHtml = tools.length > 0
        ? tools.map((t, ti) => `
          <div class="nbs-item" data-kind="tool" data-srv="${sidx}" data-i="${ti}">
            <span class="nbs-item-icon">${looksLikeSqlTool(t.name) ? '⛁' : '⚙'}</span>
            <span class="nbs-item-name">${escapeHtml(t.name)}</span>
            ${t.description ? `<span class="nbs-item-desc">${escapeHtml(t.description)}</span>` : ''}
          </div>`).join('')
        : '<div class="nbs-empty-sub">No tools reported</div>';
      return `
        <div class="nbs-server">
          <div class="nbs-server-head">
            <span class="nbs-plug">🔌</span>
            <span class="nbs-server-name">${escapeHtml(srv.name)}</span>
            ${srv.url ? `<span class="nbs-server-url">${escapeHtml(srv.url)}</span>` : ''}
          </div>
          <div class="nbs-section">Recipes (${recipes.length})</div>
          <div class="nbs-list">${recipesHtml}</div>
          <div class="nbs-section">Tools / Tables (${tools.length})</div>
          <div class="nbs-list">${toolsHtml}</div>
        </div>`;
    }).join('');
  }

  // Bind click handlers for items
  body.querySelectorAll<HTMLElement>('.nbs-item').forEach((el) => {
    el.addEventListener('click', () => {
      const sidx = parseInt(el.dataset.srv!, 10);
      const i = parseInt(el.dataset.i!, 10);
      const srv = servers[sidx];
      if (!srv) return;
      if (el.dataset.kind === 'recipe') {
        const r = (srv.recipes || [])[i];
        if (!r) return;
        const content = `# Using recipe: ${r.name}\n\nCall \`${srv.name}_get_recipe('${r.name}')\` to load, then follow its instructions.`;
        onInsertCell('md', content);
      } else {
        const t = (srv.tools || [])[i];
        if (!t) return;
        if (looksLikeSqlTool(t.name)) {
          onInsertCell('sql', `-- TODO: write your query\nSELECT * FROM <table> LIMIT 10;`);
        } else {
          onInsertCell('js', `// TODO: call ${t.name}\n// Arguments: see tool schema`);
        }
      }
      overlay.classList.remove('open');
    });
  });

  // Bind "+ Connect new server" trigger
  if (onConnectNew) {
    const connectBtn = body.querySelector('.nbs-connect-trigger') as HTMLElement | null;
    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        overlay.classList.remove('open');
        onConnectNew();
      });
    }
  }

  overlay.classList.add('open');
}

// ---------------------------------------------------------------------------
// "Connect MCP data server" modal — prompts the user for name + url
// ---------------------------------------------------------------------------

let connectOverlay: HTMLElement | null = null;

function ensureConnectOverlay(): HTMLElement {
  if (connectOverlay && document.body.contains(connectOverlay)) return connectOverlay;
  connectOverlay = document.createElement('div');
  connectOverlay.className = 'nbs-connect-overlay';
  connectOverlay.innerHTML = `
    <div class="nbs-connect-modal">
      <div class="nbs-connect-header">
        <div class="nbs-connect-title">Connect MCP data server</div>
        <button class="nbs-close nbs-connect-close" title="close">×</button>
      </div>
      <div class="nbs-connect-body">
        <label class="nbs-connect-field">
          <span class="nbs-connect-label">Name</span>
          <input type="text" class="nbs-connect-input nbs-connect-name" placeholder="e.g. tricoteuses" required />
        </label>
        <label class="nbs-connect-field">
          <span class="nbs-connect-label">URL</span>
          <input type="url" class="nbs-connect-input nbs-connect-url" placeholder="https://api.example.com/mcp" required />
        </label>
        <div class="nbs-connect-error" hidden></div>
      </div>
      <div class="nbs-connect-actions">
        <button class="nb-btn nbs-connect-cancel" type="button">cancel</button>
        <button class="nb-btn nb-btn-primary nbs-connect-submit" type="button">Connect</button>
      </div>
    </div>`;
  document.body.appendChild(connectOverlay);
  return connectOverlay;
}

export function openConnectServerModal(onConnect: (desc: { name: string; url: string }) => void): void {
  const overlay = ensureConnectOverlay();
  const nameInput = overlay.querySelector('.nbs-connect-name') as HTMLInputElement;
  const urlInput = overlay.querySelector('.nbs-connect-url') as HTMLInputElement;
  const errorEl = overlay.querySelector('.nbs-connect-error') as HTMLElement;
  const submitBtn = overlay.querySelector('.nbs-connect-submit') as HTMLElement;
  const cancelBtn = overlay.querySelector('.nbs-connect-cancel') as HTMLElement;
  const closeBtn = overlay.querySelector('.nbs-connect-close') as HTMLElement;

  nameInput.value = '';
  urlInput.value = '';
  errorEl.hidden = true;
  errorEl.textContent = '';

  const cleanup = () => {
    overlay.classList.remove('open');
    submitBtn.removeEventListener('click', onSubmit);
    cancelBtn.removeEventListener('click', onCancel);
    closeBtn.removeEventListener('click', onCancel);
    overlay.removeEventListener('click', onBackdrop);
    nameInput.removeEventListener('keydown', onKey);
    urlInput.removeEventListener('keydown', onKey);
  };
  const showError = (msg: string) => {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  };
  const onSubmit = () => {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!name) { showError('Name is required.'); return; }
    if (!url) { showError('URL is required.'); return; }
    try { new URL(url); } catch { showError('Invalid URL.'); return; }
    cleanup();
    onConnect({ name, url });
  };
  const onCancel = () => { cleanup(); };
  const onBackdrop = (e: Event) => { if (e.target === overlay) cleanup(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
    else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  submitBtn.addEventListener('click', onSubmit);
  cancelBtn.addEventListener('click', onCancel);
  closeBtn.addEventListener('click', onCancel);
  overlay.addEventListener('click', onBackdrop);
  nameInput.addEventListener('keydown', onKey);
  urlInput.addEventListener('keydown', onKey);

  overlay.classList.add('open');
  setTimeout(() => nameInput.focus(), 0);
}

/**
 * Build a "data servers" button and attach it to `container`.
 * The button is rendered as a small pill with a 🔌 icon and a (N) badge.
 * Clicking it opens the shared modal; clicking a recipe/tool inserts a cell into `state`.
 */
export function buildServersButton(
  state: NotebookState,
  container: HTMLElement,
  data: Record<string, unknown>,
  rerender: () => void
): HTMLElement {
  const btn = document.createElement('button');
  btn.className = 'nb-btn nbs-trigger';
  btn.type = 'button';
  btn.title = 'Data servers';

  const refresh = () => {
    const servers = collectDataServers(data);
    const count = servers.length;
    btn.innerHTML = `🔌 <span class="nbs-badge">${count}</span>`;
    btn.classList.toggle('nbs-empty-btn', count === 0);
  };
  refresh();

  function connectMcpServer(desc: { name: string; url: string }) {
    // 1. Push into data.servers if data is an object
    if (data && typeof data === 'object') {
      const servers = Array.isArray((data as any).servers) ? (data as any).servers : [];
      servers.push({ name: desc.name, url: desc.url, kind: 'data' });
      (data as any).servers = servers;
    }
    // 2. Push into the vanilla canvas store if available
    try {
      const canvasAny: any = (globalThis as any).__canvasVanilla || (globalThis as any).canvasVanilla;
      if (canvasAny?.update) {
        canvasAny.update((st: any) => {
          if (!Array.isArray(st.dataServers)) st.dataServers = [];
          st.dataServers.push({ name: desc.name, url: desc.url, kind: 'data' });
        });
      }
    } catch { /* ignore */ }
    // 3. refresh + rerender
    refresh();
    rerender();
  }

  btn.addEventListener('click', () => {
    const servers = collectDataServers(data);
    if (servers.length === 0) {
      openConnectServerModal((desc) => connectMcpServer(desc));
      return;
    }
    openServersModal(
      servers,
      (type, content) => {
        addCell(state, type, { content, status: 'stale' });
        rerender();
      },
      () => {
        openConnectServerModal((desc) => connectMcpServer(desc));
      }
    );
  });

  // Subscribe to canvas changes so the badge updates when the MCP connects
  try {
    const canvasAny: any = (globalThis as any).__canvasVanilla || (globalThis as any).canvasVanilla;
    if (canvasAny?.subscribe) {
      const unsub = canvasAny.subscribe(() => refresh());
      // store unsub on the button for potential cleanup
      (btn as any).__nbsUnsub = unsub;
    }
  } catch { /* ignore */ }

  container.appendChild(btn);
  return btn;
}

// ---------------------------------------------------------------------------
// Publish controls (button + optional badge + optional footer)
// Shared across all 4 notebook layouts so publish/update behaves identically.
// ---------------------------------------------------------------------------

export interface PublishControlsOptions {
  /** DOM element where to append the publish button (required). */
  buttonSlot: HTMLElement;
  /** DOM element where to append the published badge (top-right). If absent, badge is not rendered. */
  badgeSlot?: HTMLElement;
  /** DOM element where to append the published footer (URL + open link). If absent, footer is not rendered. */
  footerSlot?: HTMLElement;
  /** Called after a successful publish/update so the caller can rerender. */
  onPublished?: (info: { slug: string; url: string; updated: boolean }) => void;
  /** Optional toast function — falls back to internal toast helper if absent. */
  toast?: (message: string, isError?: boolean) => void;
  /** Minimal projection of the state sent to the server. If absent, sends { id, title, kicker, mode, cells }. */
  serializeState?: (state: NotebookState) => Record<string, unknown>;
}

interface PublishControlsHandles {
  btn: HTMLButtonElement;
  badge: HTMLAnchorElement | null;
  footer: HTMLElement | null;
}

function publishUrlFor(slug: string): string {
  return `${NB_PUBLISH_HOST}/p/${slug}`;
}

function publishBtnLabel(state: NotebookState): string {
  return state.publishedSlug ? '🔄 update' : '📤 publish';
}

function refreshPublishControls(state: NotebookState, controls: PublishControlsHandles): void {
  const { btn, badge, footer } = controls;
  btn.textContent = publishBtnLabel(state);
  btn.dataset.state = state.publishedSlug ? 'published' : 'draft';
  if (state.publishedSlug) {
    btn.title = `Update ${publishUrlFor(state.publishedSlug)}`;
  } else {
    btn.title = 'Publish this notebook';
  }
  if (badge) {
    if (state.publishedSlug) {
      const url = publishUrlFor(state.publishedSlug);
      badge.href = url;
      badge.textContent = `📤 ${state.publishedSlug}`;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }
  if (footer) {
    if (state.publishedSlug) {
      const url = publishUrlFor(state.publishedSlug);
      footer.innerHTML = `Published at <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`;
      footer.style.display = '';
    } else {
      footer.innerHTML = '';
      footer.style.display = 'none';
    }
  }
}

function fallbackPublishToast(message: string, isError?: boolean): void {
  // Reuse undo-toast styling as a generic ephemeral indicator.
  const toast = document.createElement('div');
  toast.className = 'nb-undo-toast' + (isError ? ' nb-undo-toast-error' : '');
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('nb-show'));
  setTimeout(() => {
    toast.classList.remove('nb-show');
    setTimeout(() => toast.parentNode?.removeChild(toast), 220);
  }, 3200);
}

/**
 * Create publish controls (button + optional badge + optional footer) wired
 * against the shared `nb.hyperskills.net` endpoint. Returns a `destroy()`
 * callback for cleanup.
 */
export function createPublishControls(state: NotebookState, opts: PublishControlsOptions): () => void {
  const btn = document.createElement('button');
  btn.className = 'nb-btn nb-publish-btn';
  btn.type = 'button';
  opts.buttonSlot.appendChild(btn);

  let badge: HTMLAnchorElement | null = null;
  if (opts.badgeSlot) {
    badge = document.createElement('a');
    badge.className = 'nb-published-badge';
    badge.target = '_blank';
    badge.rel = 'noopener';
    opts.badgeSlot.appendChild(badge);
  }

  let footer: HTMLElement | null = null;
  if (opts.footerSlot) {
    footer = document.createElement('div');
    footer.className = 'nb-published-footer';
    opts.footerSlot.appendChild(footer);
  }

  const controls: PublishControlsHandles = { btn, badge, footer };
  refreshPublishControls(state, controls);

  const toast = opts.toast ?? fallbackPublishToast;

  const onClick = async () => {
    const prevLabel = btn.textContent ?? '';
    btn.disabled = true;
    btn.textContent = state.publishedSlug ? '… updating' : '… publishing';
    try {
      const minimal = opts.serializeState
        ? opts.serializeState(state)
        : {
            id: state.id,
            title: state.title,
            kicker: state.kicker,
            mode: state.mode,
            cells: state.cells,
          };
      const res = await fetch(`${NB_PUBLISH_HOST}/api/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          state: minimal,
          slug: state.publishedSlug,
          token: state.publishedToken,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reply: any = await res.json();
      state.publishedSlug = reply.slug;
      state.publishedToken = reply.token;
      state.lastEditAt = Date.now();
      const url: string = reply.url ?? publishUrlFor(String(reply.slug));
      try { await navigator.clipboard?.writeText?.(url); } catch { /* ignore */ }
      const updated = Boolean(reply.updated);
      toast(
        updated
          ? `updated · ${url.replace(/^https?:\/\//, '')} (copied)`
          : `published · ${url.replace(/^https?:\/\//, '')} (copied)`
      );
      opts.onPublished?.({ slug: String(reply.slug), url, updated });
    } catch (err: any) {
      toast(`publish failed · ${String(err?.message ?? err)}`, true);
      btn.textContent = prevLabel;
    } finally {
      btn.disabled = false;
      refreshPublishControls(state, controls);
    }
  };

  btn.addEventListener('click', onClick);

  return () => {
    btn.removeEventListener('click', onClick);
    btn.parentNode?.removeChild(btn);
    badge?.parentNode?.removeChild(badge);
    footer?.parentNode?.removeChild(footer);
  };
}

/**
 * Auto-connect any data servers declared in recipe frontmatter (`data.servers`)
 * to the shared canvas store. No-op / no-throw if the canvas store is absent.
 * Calls `refresh()` (if provided) once merging is done.
 */
export function autoConnectFrontmatterServers(
  data: Record<string, unknown>,
  refresh?: () => void
): void {
  try {
    const declared = Array.isArray((data as any)?.servers) ? (data as any).servers : [];
    if (declared.length === 0) return;
    const canvasAny: any = (globalThis as any).__canvasVanilla || (globalThis as any).canvasVanilla;
    if (!canvasAny?.update) return;
    canvasAny.update((st: any) => {
      if (!Array.isArray(st.dataServers)) st.dataServers = [];
      const existing = new Set(st.dataServers.map((s: any) => s?.name));
      for (const srv of declared) {
        const name = srv?.name;
        if (name && !existing.has(name)) {
          st.dataServers.push({ name, url: srv.url, kind: 'data' });
        }
      }
    });
    refresh?.();
  } catch { /* ignore */ }
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

/**
 * Phase 1 agents: pass `dispatchShare` from ./share-handlers.js as onFormat,
 * wrapped with container ref. Example:
 *   openShareModal(state, (fmt) => dispatchShare(fmt, state, { container, onResult: toast }));
 */
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

/* Data servers button + modal */
.nbs-trigger {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
}
.nbs-trigger .nbs-badge {
  display: inline-block;
  font-size: 9.5px; padding: 1px 6px; border-radius: 999px;
  background: var(--color-surface2); color: var(--color-text2);
  font-variant-numeric: tabular-nums;
}
.nbs-trigger:not(:disabled):hover .nbs-badge {
  background: var(--color-accent); color: #fff;
}
.nbs-trigger.nbs-empty-btn {
  opacity: 0.45; cursor: not-allowed;
}

.nbs-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: none; align-items: center; justify-content: center;
  z-index: 1002; padding: 24px;
}
.nbs-overlay.open { display: flex; }
.nbs-modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  width: 100%; max-width: 720px; max-height: 80vh;
  display: flex; flex-direction: column;
  font-family: var(--font-sans, 'Syne', sans-serif);
  overflow: hidden;
}
.nbs-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 22px;
  border-bottom: 1px solid var(--color-border);
}
.nbs-title { font-size: 16px; font-weight: 600; color: var(--color-text1); }
.nbs-close {
  background: transparent; border: none; cursor: pointer;
  color: var(--color-text2); font-size: 22px; line-height: 1;
  width: 30px; height: 30px; border-radius: 50%;
}
.nbs-close:hover { color: var(--color-text1); background: var(--color-surface2); }

.nbs-body {
  padding: 16px 22px; overflow-y: auto; flex: 1;
  display: flex; flex-direction: column; gap: 18px;
}
.nbs-empty {
  color: var(--color-text2); font-size: 13px;
  padding: 30px 0; text-align: center; font-style: italic;
}
.nbs-empty-sub {
  color: var(--color-text2); font-size: 11px;
  padding: 6px 4px; font-style: italic;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
}
.nbs-server {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-bg);
  overflow: hidden;
}
.nbs-server-head {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: var(--color-surface2);
  border-bottom: 1px solid var(--color-border);
}
.nbs-plug { font-size: 14px; }
.nbs-server-name {
  font-size: 13px; color: var(--color-text1); font-weight: 500;
}
.nbs-server-url {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10.5px; color: var(--color-text2);
  margin-left: auto;
}
.nbs-section {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--color-text2);
  padding: 10px 14px 4px;
}
.nbs-list {
  display: flex; flex-direction: column; gap: 2px;
  padding: 0 8px 10px;
}
.nbs-item {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 10px; border-radius: 6px;
  cursor: pointer; font-size: 12.5px;
  color: var(--color-text1);
  transition: background 0.12s;
}
.nbs-item:hover { background: var(--color-surface2); }
.nbs-item-icon { font-size: 12px; width: 16px; text-align: center; flex-shrink: 0; }
.nbs-item-name {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 12px; color: var(--color-accent);
  flex-shrink: 0;
}
.nbs-item-desc {
  font-size: 11px; color: var(--color-text2);
  margin-left: 4px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* "+ Connect new server" trigger inside servers modal */
.nbs-connect-trigger {
  align-self: flex-start;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px;
}

/* Connect MCP data server modal */
.nbs-connect-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: none; align-items: center; justify-content: center;
  z-index: 1003; padding: 24px;
}
.nbs-connect-overlay.open { display: flex; }
.nbs-connect-modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  width: 100%; max-width: 480px;
  display: flex; flex-direction: column;
  font-family: var(--font-sans, 'Syne', sans-serif);
  overflow: hidden;
}
.nbs-connect-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 22px;
  border-bottom: 1px solid var(--color-border);
}
.nbs-connect-title { font-size: 16px; font-weight: 600; color: var(--color-text1); }
.nbs-connect-body {
  padding: 18px 22px;
  display: flex; flex-direction: column; gap: 14px;
}
.nbs-connect-field {
  display: flex; flex-direction: column; gap: 6px;
}
.nbs-connect-label {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--color-text2);
}
.nbs-connect-input {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 12.5px;
  color: var(--color-text1);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 10px;
  outline: none;
  transition: border-color 0.15s;
}
.nbs-connect-input:focus { border-color: var(--color-accent); }
.nbs-connect-error {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px;
  color: var(--color-accent2, #fa6d7c);
  padding: 2px 0;
}
.nbs-connect-actions {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 22px 18px;
  border-top: 1px solid var(--color-border);
}

/* Chart rendering (Vega-Lite via vega-embed) — shared across all 4 widgets */
.nb-chart {
  width: 100%; max-width: 100%;
  min-height: 180px;
  background: var(--color-bg);
  border-radius: 4px;
  padding: 8px;
  box-sizing: border-box;
  overflow: auto;
}
.nb-chart canvas, .nb-chart svg { max-width: 100%; height: auto; display: block; }
.nb-chart-fallback {
  margin: 0;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; line-height: 1.5;
  color: var(--color-text1);
  background: var(--color-surface2);
  padding: 8px 10px; border-radius: 4px;
  max-height: 240px; overflow: auto;
  white-space: pre-wrap;
}
.nb-chart-fallback-note {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 10px; color: var(--color-text2);
  margin-bottom: 4px; font-style: italic;
}

/* Cell execution logs — shared across all 4 widgets */
.nb-logs {
  background: rgba(160,160,184,0.06);
  border-left: 2px solid var(--color-text2);
  border-radius: 0 4px 4px 0;
  margin: 4px 0 6px;
  padding: 6px 10px;
  max-height: 160px;
  overflow-y: auto;
}
.nb-logs-label {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 9.5px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--color-text2);
  margin-bottom: 4px;
}
.nb-logs pre {
  margin: 0;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; line-height: 1.5;
  color: var(--color-text1);
  white-space: pre-wrap; word-break: break-word;
}
.nb-logs .nb-log-warn { color: var(--color-amber, #f0a050); }
.nb-logs .nb-log-error { color: var(--color-accent2, #fa6d7c); }

/* Publish controls (button + published badge + footer) */
.nb-publish-btn {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px;
}
.nb-publish-btn[data-state="published"] { color: var(--color-accent); }
.nb-published-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  background: var(--color-accent); color: #fff;
  border-radius: 999px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; font-weight: 600;
  text-decoration: none; cursor: pointer;
}
.nb-published-badge:hover { filter: brightness(1.1); }
.nb-published-footer {
  padding: 8px 0; border-top: 1px dashed var(--color-border);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 11px; color: var(--color-text2);
}
.nb-published-footer a { color: var(--color-accent); text-decoration: none; }
.nb-published-footer a:hover { text-decoration: underline; }

/* Undo toast (used by deleteCellWithConfirm + generic publish toast fallback) */
.nb-undo-toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: var(--color-surface2, #1a1a1f); color: var(--color-text1, #fff);
  border: 1px solid var(--color-border, #333); border-radius: 8px;
  padding: 10px 16px; font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 12px; line-height: 1.4;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  z-index: 1010; display: inline-flex; align-items: center; gap: 10px;
  max-width: 480px; opacity: 0; transition: opacity 0.2s;
}
.nb-undo-toast.nb-show { opacity: 1; }
.nb-undo-toast-error { border-color: var(--color-accent2, #fa6d7c); color: var(--color-accent2, #fa6d7c); }
.nb-undo-toast-undo {
  font-family: inherit; font-size: inherit; font-weight: 600;
  color: var(--color-accent, #6a55ff); cursor: pointer;
  background: none; border: none; padding: 0; text-decoration: underline;
}
.nb-undo-toast-undo:hover { filter: brightness(1.15); }
`;

// ---------------------------------------------------------------------------
// Shared UI parts: Run/Stop control, history panel, drag-drop
// ---------------------------------------------------------------------------

export function mountRunControls(container: HTMLElement, cell: NotebookCell, cellWrap: HTMLElement, notebookState: NotebookState | null, rerender: () => void): void {
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
  run.addEventListener('click', () => startRun(cell, notebookState, rerender));
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

/**
 * Delete a cell and show an ephemeral "Undo" toast.
 * (Signature preserved for compatibility with the 4 widgets; the old
 * modal-confirm flow has been replaced by an undo toast pattern.)
 */
export function deleteCellWithConfirm(
  state: NotebookState,
  cell: NotebookCell,
  labelFor: (c: NotebookCell) => string,
  rerender: () => void
): void {
  const idx = state.cells.findIndex((c) => c.id === cell.id);
  if (idx < 0) return;
  const label = labelFor(cell);
  const snapshotCell: NotebookCell = typeof (globalThis as any).structuredClone === 'function'
    ? (globalThis as any).structuredClone(cell)
    : JSON.parse(JSON.stringify(cell));
  // Manually push a history entry so we have a direct reference to remove on undo.
  const entry: HistoryEntry = {
    ts: Date.now(),
    kind: 'del',
    summary: `removed ${label}`,
    snapshot: { cell: snapshotCell, idx },
  };
  state.history.unshift(entry);
  if (state.history.length > 100) state.history.pop();
  state.cells.splice(idx, 1);
  state.lastEditAt = Date.now();
  rerender();
  showUndoToast(`${label} removed · restorable from history`, () => {
    const i = state.history.indexOf(entry);
    if (i >= 0) state.history.splice(i, 1);
    const insertAt = Math.min(idx, state.cells.length);
    state.cells.splice(insertAt, 0, snapshotCell);
    state.lastEditAt = Date.now();
    rerender();
  });
}

/**
 * Internal: show a small "X removed · restorable from history" toast with an
 * Undo link. The toast auto-dismisses after ~5s. Clicking Undo invokes the
 * callback and dismisses the toast early.
 */
function showUndoToast(message: string, onUndo: () => void): void {
  const toast = document.createElement('div');
  toast.className = 'nb-undo-toast';
  const msgEl = document.createElement('span');
  msgEl.className = 'nb-undo-toast-msg';
  msgEl.textContent = message;
  const undoBtn = document.createElement('button');
  undoBtn.className = 'nb-undo-toast-undo';
  undoBtn.type = 'button';
  undoBtn.textContent = 'Undo';
  toast.appendChild(msgEl);
  toast.appendChild(undoBtn);
  document.body.appendChild(toast);
  // Next tick: trigger fade-in.
  requestAnimationFrame(() => toast.classList.add('nb-show'));

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    toast.classList.remove('nb-show');
    setTimeout(() => { toast.parentNode?.removeChild(toast); }, 220);
  };
  const timeoutId = setTimeout(dismiss, 5000);
  undoBtn.addEventListener('click', () => {
    clearTimeout(timeoutId);
    try { onUndo(); } catch { /* ignore */ }
    dismiss();
  });
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

/**
 * Build a `.nb-logs` panel for a CellResult, or return null if there are no logs.
 * Each log is rendered on its own line; the panel is scrollable when long.
 * Prefixes like "[warn]" / "[error]" get color-coded.
 */
export function renderCellLogs(result: CellResult | undefined | null): HTMLElement | null {
  if (!result || !result.logs || result.logs.length === 0) return null;
  const box = document.createElement('div');
  box.className = 'nb-logs';
  const label = document.createElement('div');
  label.className = 'nb-logs-label';
  label.textContent = `console · ${result.logs.length} line${result.logs.length === 1 ? '' : 's'}`;
  box.appendChild(label);
  const pre = document.createElement('pre');
  pre.innerHTML = result.logs.map((line) => {
    const esc = escapeHtml(String(line ?? ''));
    if (/^\[warn\]/i.test(line)) return `<span class="nb-log-warn">${esc}</span>`;
    if (/^\[error\]/i.test(line)) return `<span class="nb-log-error">${esc}</span>`;
    return esc;
  }).join('\n');
  box.appendChild(pre);
  return box;
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
