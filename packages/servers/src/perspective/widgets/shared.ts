// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared Perspective utilities — lazy worker, viewer mount, theme, empty hint
// ---------------------------------------------------------------------------

let _worker: any = null;
let _vendorLoaded = false;

/**
 * Lazy-load Perspective worker + viewer custom elements.
 * Returns a singleton worker for `worker.table(...)`.
 */
export async function loadPerspective(): Promise<any> {
  if (!_vendorLoaded) {
    // Use the *.inline.js variants of @finos/perspective and
    // @finos/perspective-viewer (v3.x): they embed the wasm bytes as a
    // base64 blob and call init_client / init_server at module load time,
    // so the bundler does not need to emit (or fetch) any .wasm asset.
    // Cost: ~6.9 MB extra JS (3.3 MB viewer + 3.6 MB engine), ungzipped.
    // Trade-off accepted: zero wasm plumbing in the Vite/SvelteKit build.
    await import('@finos/perspective-viewer/dist/esm/perspective-viewer.inline.js');
    await import('@finos/perspective-viewer-datagrid');
    await import('@finos/perspective-viewer-d3fc');
    _vendorLoaded = true;
  }
  if (_worker) return _worker;
  const ps = await import('@finos/perspective/dist/esm/perspective.inline.js');
  const mod: any = (ps as any).default ?? ps;
  // v3.x exposes `worker()` factory at module top-level.
  if (typeof mod.worker === 'function') {
    _worker = await mod.worker();
  } else if (typeof mod.default === 'function') {
    _worker = mod.default();
  } else if (mod.default && typeof mod.default.worker === 'function') {
    _worker = await mod.default.worker();
  } else {
    throw new Error('Unable to initialise Perspective worker');
  }
  return _worker;
}

/**
 * Convert any reasonable input into an array of plain rows.
 * Accepted shapes:
 *  - {rows: [{...}]}, {data: [{...}]}, {values: [{...}]}
 *  - plain array of objects
 *  - column-form `{col: [v1, v2, ...]}` (zipped into rows)
 */
export function toRows(data: any): any[] {
  if (!data) return [];
  for (const k of ['rows', 'data', 'values', 'records']) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  if (Array.isArray(data)) return data;
  // Column-form: { a: [...], b: [...] } where every value is an array of equal length.
  if (typeof data === 'object') {
    const keys = Object.keys(data).filter((k) => Array.isArray((data as any)[k]));
    if (keys.length >= 2) {
      const len = Math.min(...keys.map((k) => (data as any)[k].length));
      const out: any[] = [];
      for (let i = 0; i < len; i++) {
        const row: any = {};
        for (const k of keys) row[k] = (data as any)[k][i];
        out.push(row);
      }
      return out;
    }
  }
  return [];
}

/**
 * Visible empty-state hint, mirrors vegalite's renderEmpty.
 */
export function renderEmpty(container: HTMLElement, widgetId: string, hint?: string): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — no data</strong><br>
      ${hint ?? "Pass <code>{rows: [{col1, col2, ...}]}</code> or <code>{data: [...]}</code> or column-form <code>{a:[...], b:[...]}</code>."}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/**
 * Apply Perspective's "Pro" theme via class, transparent background, and reasonable height.
 */
function applyChrome(container: HTMLElement): void {
  container.style.width = container.style.width || '100%';
  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '420px';
  container.style.display = container.style.display || 'flex';
}

/**
 * Mount a `<perspective-viewer>` with the given config and return cleanup.
 *
 * @param container target host element
 * @param data      caller payload
 * @param widgetId  for empty-state hint
 * @param config    Perspective `restore()` config (plugin, group_by, etc.)
 */
export async function mountViewer(
  container: HTMLElement,
  data: any,
  widgetId: string,
  config: Record<string, any>,
): Promise<() => void> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, widgetId);

  applyChrome(container);

  const worker = await loadPerspective();
  const table = await worker.table(rows);

  const viewer: any = document.createElement('perspective-viewer');
  viewer.style.flex = '1 1 auto';
  viewer.style.minHeight = '400px';
  viewer.setAttribute('theme', 'Pro Light');
  container.appendChild(viewer);

  await viewer.load(Promise.resolve(table));

  // Strip undefined keys so Perspective doesn't choke on them.
  const cleanCfg: Record<string, any> = {};
  for (const k of Object.keys(config)) {
    if (config[k] !== undefined && config[k] !== null) cleanCfg[k] = config[k];
  }

  try {
    await viewer.restore(cleanCfg);
  } catch (e) {
    // Plugin may not be available in this build — fall back to Datagrid.
    try {
      await viewer.restore({ ...cleanCfg, plugin: 'Datagrid' });
    } catch {
      // ignore
    }
  }

  return () => {
    try {
      viewer.delete?.();
    } catch {
      // ignore
    }
    try {
      table.delete?.();
    } catch {
      // ignore
    }
    try {
      container.removeChild(viewer);
    } catch {
      // ignore
    }
  };
}

/**
 * Coerce param into string array. Accepts string | string[] | undefined.
 */
export function toArr(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [String(v)];
}
