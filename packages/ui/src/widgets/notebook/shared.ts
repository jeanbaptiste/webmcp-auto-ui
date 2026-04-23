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
  /**
   * Live mode (opt-in). When true and `mode === 'view'`, SQL cells are
   * re-executed against their declared data servers at mount time, producing
   * a RuntimeOverlay consumed at render. Default false (frozen snapshots).
   */
  autoRun?: boolean;
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

/**
 * Scroll-preservation helper for rerender paths that wipe-and-rebuild a cells
 * container. Call BEFORE the rebuild; invoke the returned fn AFTER.
 *
 * Walks up from `anchor` collecting scrollable ancestors, snapshots their
 * scrollTop + window.scrollY + active-cell id, and restores them on the next
 * animation frame. Without this, clicking a cell's run button scrolls the
 * page back to the top because the cells container briefly collapses.
 */
export function preserveScrollAround(anchor: HTMLElement): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => { /* no-op in SSR */ };
  }
  const scrollParents: HTMLElement[] = [];
  let node: HTMLElement | null = anchor;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) {
      scrollParents.push(node);
    }
    node = node.parentElement;
  }
  const winY = window.scrollY;
  const saved = scrollParents.map((el) => el.scrollTop);
  const activeEl = document.activeElement as HTMLElement | null;
  const activeCellId = activeEl?.closest<HTMLElement>('[data-cell-id]')?.dataset.cellId ?? null;

  return () => {
    requestAnimationFrame(() => {
      scrollParents.forEach((el, i) => { el.scrollTop = saved[i]!; });
      try { window.scrollTo({ top: winY, behavior: 'instant' as ScrollBehavior }); }
      catch { window.scrollTo(0, winY); }
      if (activeCellId) {
        const host = anchor.querySelector<HTMLElement>(`[data-cell-id="${activeCellId}"] textarea`);
        host?.focus?.();
      }
    });
  };
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
    autoRun: initial?.autoRun ?? false,
  };
}

// ---------------------------------------------------------------------------
// Live mode (autoRun) — RuntimeOverlay + helpers
//
// Principle: when a notebook is viewed with `state.autoRun && state.mode==='view'`,
// SQL cells are re-executed against their declared data servers, but the
// canonical state is NEVER mutated. All live results live in a RuntimeOverlay
// (ephemeral, per-mount). Rendering reads `effectiveResult(cell, overlay)` which
// falls back to `cell.lastResult` when the overlay has nothing.
//
// This preserves two invariants:
//   1) The published JSON is an immutable source of truth.
//   2) Toggling autoRun OFF at runtime re-shows frozen snapshots immediately.
// ---------------------------------------------------------------------------

export type CellRuntimeStatus = 'idle' | 'pending' | 'running' | 'fresh' | 'stale' | 'frozen';

export interface RuntimeOverlay {
  /** Fresh results keyed by cell id. */
  outputs: Map<string, { result: CellResult; refreshedAt: number }>;
  /** Per-cell status during/after the refresh cycle. */
  status: Map<string, CellRuntimeStatus>;
  startedAt: number | null;
  finishedAt: number | null;
  /** Last fatal reason (e.g. "no reachable server"). */
  error: string | null;
}

export function createRuntimeOverlay(): RuntimeOverlay {
  return {
    outputs: new Map(),
    status: new Map(),
    startedAt: null,
    finishedAt: null,
    error: null,
  };
}

/** Result to render for a cell: live if available, else frozen, else undefined. */
export function effectiveResult(cell: NotebookCell, overlay: RuntimeOverlay | null | undefined): CellResult | undefined {
  const live = overlay?.outputs.get(cell.id);
  if (live) return live.result;
  return cell.lastResult;
}

/** Display status (drives badges). Defaults to 'frozen' for non-rerunnable, else 'idle'. */
export function cellRuntimeStatus(cell: NotebookCell, overlay: RuntimeOverlay | null | undefined): CellRuntimeStatus {
  const s = overlay?.status.get(cell.id);
  if (s) return s;
  if (!isReRunnable(cell)) return 'frozen';
  return 'idle';
}

/** Live-mode whitelist. Only SQL cells are re-executable publicly. */
export function isReRunnable(cell: NotebookCell): boolean {
  return cell.type === 'sql';
}

/**
 * Host-supplied runner for a single cell. Returns the fresh result, or throws.
 * The host decides how to talk to MCP (bridge, postMessage, local, etc.).
 */
export type CellRunner = (cell: NotebookCell, signal: AbortSignal) => Promise<CellResult>;

export interface AutoRefreshOptions {
  state: NotebookState;
  overlay: RuntimeOverlay;
  runner: CellRunner;
  /** Per-cell sub-render request — invoked whenever the overlay changes for a cell. */
  onCellChange?: (cellId: string) => void;
  /** Global tick — invoked on start / per cell / on finish. UI uses it for toolbar badges. */
  onTick?: (overlay: RuntimeOverlay) => void;
  signal?: AbortSignal;
}

export interface AutoRefreshSummary {
  rerun: number;
  frozen: number;
  stale: number;
  failed: number;
}

/**
 * Drive the live refresh cycle. Mutates ONLY the overlay (never the state).
 * Calls runner sequentially per cell to keep load low and order predictable.
 */
export async function runAutoRefresh(opts: AutoRefreshOptions): Promise<AutoRefreshSummary> {
  const { state, overlay, runner, onCellChange, onTick, signal } = opts;
  overlay.startedAt = Date.now();
  overlay.finishedAt = null;
  overlay.error = null;

  // Seed status
  for (const c of state.cells) {
    overlay.status.set(c.id, isReRunnable(c) ? 'pending' : 'frozen');
  }
  onTick?.(overlay);

  const summary: AutoRefreshSummary = { rerun: 0, frozen: 0, stale: 0, failed: 0 };

  for (const cell of state.cells) {
    if (signal?.aborted) break;
    if (!isReRunnable(cell)) { summary.frozen++; continue; }

    overlay.status.set(cell.id, 'running');
    onCellChange?.(cell.id);
    onTick?.(overlay);

    try {
      const result = await runner(cell, signal ?? new AbortController().signal);
      if (result.ok) {
        overlay.outputs.set(cell.id, { result, refreshedAt: Date.now() });
        overlay.status.set(cell.id, 'fresh');
        summary.rerun++;
      } else {
        overlay.status.set(cell.id, 'stale');
        summary.stale++;
      }
    } catch (err) {
      overlay.status.set(cell.id, 'stale');
      summary.failed++;
      if (!overlay.error) overlay.error = err instanceof Error ? err.message : String(err);
    }
    onCellChange?.(cell.id);
    onTick?.(overlay);
  }

  overlay.finishedAt = Date.now();
  onTick?.(overlay);
  return summary;
}

/** Last successful refresh timestamp (max refreshedAt across cells). */
export function lastRefreshedAt(overlay: RuntimeOverlay | null | undefined): number | null {
  if (!overlay || overlay.outputs.size === 0) return null;
  let max = 0;
  for (const v of overlay.outputs.values()) if (v.refreshedAt > max) max = v.refreshedAt;
  return max || null;
}

/**
 * Build a CellRunner backed by a MultiMcpBridge. Discovers a SQL-capable tool
 * on the connected servers (matching `*_query_sql` then `query|run|execute`),
 * calls it with `{ sql: cell.content }`, parses content-array into a table.
 *
 * Throws if no server is reachable / no SQL tool found. Callers are expected
 * to surface this as a 'stale' status, not crash.
 */
export function createBridgeSqlRunner(bridge: {
  hasServer?: (name: string) => boolean;
  connectedServers?: () => string[];
  multiClient: {
    listTools?: (url: string) => Promise<{ name: string }[]>;
    getToolsForUrl?: (url: string) => { name: string }[];
  };
  callTool: (serverName: string, toolName: string, args: unknown) => Promise<unknown>;
}, getServerDescriptors: () => DataServerDescriptor[]): CellRunner {
  const PATTERN_PRIMARY = /^.*query_sql$/i;
  const PATTERN_FALLBACK = /^(query|run|execute)(_sql)?$/i;

  function findSqlTool(servers: DataServerDescriptor[]): { serverName: string; toolName: string } | null {
    for (const srv of servers) {
      for (const t of srv.tools ?? []) {
        if (PATTERN_PRIMARY.test(t.name)) return { serverName: srv.name, toolName: t.name };
      }
    }
    for (const srv of servers) {
      for (const t of srv.tools ?? []) {
        if (PATTERN_FALLBACK.test(t.name)) return { serverName: srv.name, toolName: t.name };
      }
    }
    return null;
  }

  function parseResult(raw: unknown, startedAt: number): CellResult {
    const durationMs = Date.now() - startedAt;
    try {
      const content = (raw as { content?: unknown })?.content ?? raw;
      let text: string | null = null;
      if (Array.isArray(content)) {
        const first = content.find((c: { type?: string; text?: string }) => c?.type === 'text' && typeof c.text === 'string');
        text = first ? (first as { text: string }).text : null;
      } else if (typeof content === 'string') {
        text = content;
      }
      if (!text) return { ok: true, kind: 'empty', durationMs };
      let parsed: unknown = text;
      try { parsed = JSON.parse(text); } catch { /* keep raw string */ }
      if (Array.isArray(parsed)) {
        const rows = parsed as Record<string, unknown>[];
        const cols = rows.length ? Object.keys(rows[0]!) : [];
        return { ok: true, kind: 'table', rows, columns: cols, rowCount: rows.length, durationMs };
      }
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { rows?: unknown }).rows)) {
        const rows = (parsed as { rows: Record<string, unknown>[] }).rows;
        const cols = Array.isArray((parsed as { columns?: string[] }).columns)
          ? (parsed as { columns: string[] }).columns
          : (rows.length ? Object.keys(rows[0]!) : []);
        return { ok: true, kind: 'table', rows, columns: cols, rowCount: rows.length, durationMs };
      }
      return { ok: true, kind: 'value', value: parsed, durationMs };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err), errorKind: 'runtime', durationMs };
    }
  }

  return async (cell, _signal) => {
    const startedAt = Date.now();
    const servers = getServerDescriptors();
    if (!servers.length) {
      return { ok: false, error: 'No data server reachable', errorKind: 'schema', durationMs: 0 };
    }
    const hit = findSqlTool(servers);
    if (!hit) {
      return { ok: false, error: 'No SQL tool exposed by reachable servers', errorKind: 'schema', durationMs: 0 };
    }
    const raw = await bridge.callTool(hit.serverName, hit.toolName, { sql: cell.content });
    return parseResult(raw, startedAt);
  };
}

/**
 * High-level bootstrap: auto-connect declared servers, wait for handshake, build
 * a bridge-backed runner, fire runAutoRefresh. Safe to call from any layout at
 * mount time when `state.autoRun && state.mode === 'view'`. Returns a cleanup.
 *
 * `MultiMcpBridgeCtor` is injected (via dynamic import from @webmcp-auto-ui/core
 * by the caller) to keep this file free of a hard import cycle.
 */
export interface BootstrapLiveRefreshOptions {
  state: NotebookState;
  data: Record<string, unknown>;
  overlay: RuntimeOverlay;
  MultiMcpBridgeCtor: new (opts: { getCanvas: () => unknown }) => {
    start(): void;
    stop(): void;
    waitForEnabledServers(timeoutMs?: number): Promise<void>;
    connectedServers(): string[];
    hasServer(name: string): boolean;
    callTool(serverName: string, toolName: string, args: unknown): Promise<unknown>;
    multiClient: unknown;
  };
  onCellChange?: (cellId: string) => void;
  onTick?: (overlay: RuntimeOverlay) => void;
  timeoutMs?: number;
}

export function bootstrapLiveRefresh(opts: BootstrapLiveRefreshOptions): () => void {
  const { state, data, overlay, MultiMcpBridgeCtor, onCellChange, onTick, timeoutMs } = opts;
  const ac = new AbortController();

  void (async () => {
    try {
      autoConnectFrontmatterServers(data);
      const canvas: unknown = (globalThis as { __canvasVanilla?: unknown; canvasVanilla?: unknown })
        .__canvasVanilla ?? (globalThis as { canvasVanilla?: unknown }).canvasVanilla;
      if (!canvas) {
        overlay.error = 'No canvas available';
        overlay.finishedAt = Date.now();
        onTick?.(overlay);
        return;
      }
      const bridge = new MultiMcpBridgeCtor({ getCanvas: () => canvas });
      bridge.start();
      await bridge.waitForEnabledServers(timeoutMs ?? 5000);

      const runner = createBridgeSqlRunner(bridge, () => {
        // filter collectDataServers to only connected ones
        const all = collectDataServers(data);
        return all.filter((s) => bridge.hasServer(s.name));
      });

      await runAutoRefresh({ state, overlay, runner, onCellChange, onTick, signal: ac.signal });
    } catch (err) {
      overlay.error = err instanceof Error ? err.message : String(err);
      overlay.finishedAt = Date.now();
      onTick?.(overlay);
    }
  })();

  return () => { ac.abort(); };
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
// Run / Stop — dispatcher with pluggable executors
// ---------------------------------------------------------------------------

const runningTimers = new Map<string, { intervalId: any; timeoutId: any }>();
const runningAborts = new Map<string, AbortController>();

/**
 * Start running a cell using the executor registered on state for cell.type.
 * If no executor is registered, the cell transitions to 'done' with a clear
 * error result.
 */
export function startRun(cell: NotebookCell, state: NotebookState | null, onUpdate: () => void): void {
  cell.runState = 'running';
  cell.status = 'stale';
  (cell as any).startedAt = Date.now();
  onUpdate();

  const exec = state?.executors?.[cell.type];
  if (!exec) {
    cell.lastResult = {
      ok: false,
      error: `No executor registered for cell type '${cell.type}'`,
      errorKind: 'runtime',
      durationMs: 0,
    };
    cell.lastMs = 0;
    cell.runState = 'done';
    cell.status = 'stale';
    delete (cell as any).startedAt;
    onUpdate();
    return;
  }

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
  onUpdate();
}

export function tickRunningCell(cell: NotebookCell, elapsedEl: HTMLElement, onDone: () => void): void {
  const startedAt = (cell as any).startedAt || Date.now();
  (cell as any).startedAt = startedAt;
  const tick = () => { elapsedEl.textContent = formatDuration(Date.now() - startedAt); };
  tick();
  const intervalId = setInterval(tick, 50);
  // Executor path: interval drives elapsed display;
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

/** Return true when the server looks like a UI/webmcp server and should be hidden.
 * Primary discriminator is the explicit `kind` field; the name fallback is an
 * exact (case-insensitive) match so we don't accidentally filter custom servers
 * like "autoui-data" or "my-webmcp-server". */
function isUiServer(name: string, kind?: string): boolean {
  if (kind === 'ui' || kind === 'webmcp') return true;
  const n = (name || '').toLowerCase();
  return n === 'autoui' || n === 'webmcp';
}

/**
 * Source of truth: canvas.dataServers (enabled entries). The bridge auto-connects
 * enabled servers and populates recipes/tools on the store. When the canvas has no
 * enabled servers, we fall back to the legacy `data.servers` from recipe frontmatter
 * (read-only hint).
 */
export function collectDataServers(data: Record<string, unknown>): DataServerDescriptor[] {
  const canvas: any = (globalThis as any).__canvasVanilla ?? (globalThis as any).canvasVanilla;
  const fromCanvas: any[] = Array.isArray(canvas?.dataServers) ? canvas.dataServers : [];
  const enabled = fromCanvas.filter((s) => s?.enabled);
  if (enabled.length > 0) {
    return enabled
      .filter((s) => !isUiServer(String(s?.name ?? ''), s?.kind))
      .map((s) => ({
        name: String(s.name),
        url: s.url ? String(s.url) : undefined,
        recipes: Array.isArray(s.recipes) ? s.recipes : [],
        tools: Array.isArray(s.tools) ? s.tools : [],
      }));
  }
  // Fallback: legacy data.servers from recipe frontmatter (read-only hint)
  const fromData: any[] = Array.isArray((data as any)?.servers) ? (data as any).servers : [];
  return fromData
    .filter((s) => s?.name && !isUiServer(String(s.name), s?.kind))
    .map((s) => ({
      name: String(s.name),
      url: s.url ? String(s.url) : undefined,
      recipes: Array.isArray(s.recipes) ? s.recipes : [],
      tools: Array.isArray(s.tools) ? s.tools : [],
    }));
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
    const canvas: any = (globalThis as any).__canvasVanilla ?? (globalThis as any).canvasVanilla;
    if (!canvas?.addDataServer) return;
    for (const srv of declared) {
      const name = srv?.name;
      const url = srv?.url;
      if (!name) continue;
      const existing = canvas.getDataServer?.(name);
      if (existing) {
        if (existing.enabled === false) canvas.setDataServerEnabled?.(name, true);
      } else {
        canvas.addDataServer({ name: String(name), url: url ? String(url) : undefined });
      }
    }
    refresh?.();
  } catch { /* no-op */ }
}

// ---------------------------------------------------------------------------
// Modals (shared singletons, created on demand)
// NOTE: These overlays are page-level singletons — only one confirm/share modal
// can be open at a time per page, even if multiple notebook widgets are mounted.
// Acceptable trade-off given modals are transient and user-driven.
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
let historyTickerId: any = null;

function startHistoryTicker(): void {
  if (historyTickerId != null) return;
  if (typeof setInterval === 'undefined') return;
  historyTickerId = setInterval(() => { historyObservers.forEach((fn) => fn()); }, 15000);
}

function stopHistoryTicker(): void {
  if (historyTickerId == null) return;
  clearInterval(historyTickerId);
  historyTickerId = null;
}

export function registerHistoryObserver(fn: () => void): () => void {
  historyObservers.add(fn);
  if (historyObservers.size === 1) startHistoryTicker();
  return () => {
    historyObservers.delete(fn);
    if (historyObservers.size === 0) stopHistoryTicker();
  };
}
