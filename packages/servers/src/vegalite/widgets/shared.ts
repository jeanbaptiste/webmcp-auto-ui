// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared Vega-Lite utilities — theme-adaptive config + lazy loading
// ---------------------------------------------------------------------------

let _embed: any = null;

/** Lazy-load vega-embed (handles Vega-Lite + Vega). */
export async function loadEmbed(): Promise<any> {
  if (_embed) return _embed;
  const mod = await import('vega-embed');
  _embed = mod.default ?? mod;
  return _embed;
}

/**
 * Theme-adaptive Vega-Lite config. Uses mid-gray text (#666) and light
 * grids (#ccc) so the same palette reads on both light and dark chromes.
 */
export function vegaConfig(): any {
  const text = '#666';
  const grid = '#ccc';
  return {
    background: 'transparent',
    padding: 8,
    autosize: { type: 'fit', contains: 'padding', resize: true },
    font: 'system-ui, -apple-system, sans-serif',
    axis: {
      labelColor: text,
      titleColor: text,
      gridColor: grid,
      domainColor: grid,
      tickColor: grid,
    },
    legend: { labelColor: text, titleColor: text },
    title: { color: text, fontSize: 13, fontWeight: 600 },
    view: { stroke: 'transparent' },
  };
}

/**
 * Render a Vega-Lite spec into `container`. Returns a cleanup function.
 * - Merges theme config
 * - Uses responsive width ('container') unless explicit width provided
 * - Wires ResizeObserver so width tracks container reflow
 */
export async function embedSpec(
  container: HTMLElement,
  spec: any,
  widgetId?: string,
): Promise<() => void> {
  // Empty-data short-circuit: if the spec carries an inline `data.values`
  // array that ended up empty (because toValues() couldn't coerce input),
  // render a visible hint instead of an empty Vega frame.
  if (Array.isArray(spec?.data?.values) && spec.data.values.length === 0) {
    return renderEmpty(container, widgetId ?? 'vegalite-widget');
  }

  const embed = await loadEmbed();

  container.style.width = container.style.width || '100%';
  container.style.minHeight = container.style.minHeight || '320px';

  const merged = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 280,
    ...spec,
    config: { ...vegaConfig(), ...(spec?.config ?? {}) },
  };

  const result = await embed(container, merged, {
    actions: false,
    mode: 'vega-lite',
    renderer: 'canvas',
  });

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const ro = new ResizeObserver(() => {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      try {
        result.view?.resize()?.runAsync?.();
      } catch {
        // detached — ignore
      }
    }, 60);
  });
  ro.observe(container);

  return () => {
    ro.disconnect();
    if (resizeTimer !== null) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }
    try {
      result.finalize?.();
    } catch {
      // ignore
    }
    container.innerHTML = '';
  };
}

/**
 * Convert any reasonable input into Vega-Lite-ready `[{x, y, series?, ...}]`.
 *
 * Accepted shapes (in priority order):
 *   1. `{values: [{x, y, ...}]}`   — pre-built rows
 *   2. `{data:   [{x, y, ...}]}`   — alias often used by chart libs
 *   3. `{rows:   [{x, y, ...}]}`   — alias
 *   4. plain `[{x, y, ...}]`       — caller passed the array directly as `data`
 *   5. `{x: [...], y: [...]}`      — parallel arrays (zipped); also accepts
 *      aliases `labels`/`categories` for x and `values`/`counts` for y
 *   6. array of objects with arbitrary keys → auto-detect first string key
 *      as x and first numeric key as y.
 */
export function toValues(data: any): any[] {
  if (!data) return [];

  // (1)–(3) : explicit rows array under common keys
  for (const k of ['values', 'data', 'rows']) {
    if (Array.isArray(data?.[k])) return normalizeRows(data[k]);
  }

  // (4) : the caller passed an array as the data parameter itself
  if (Array.isArray(data)) return normalizeRows(data);

  // (5) : parallel arrays. Accept several alias names.
  const xArr = arrLike(data, ['x', 'labels', 'categories', 'category', 'index', 'keys']);
  const yArr = arrLike(data, ['y', 'values', 'value', 'counts', 'count', 'series_values']);
  if (xArr && yArr) {
    const series = arrLike(data, ['series', 'group', 'groups', 'category2']);
    const sizes = arrLike(data, ['size', 'sizes', 'r']);
    const n = Math.min(xArr.length, yArr.length);
    const rows: any[] = [];
    for (let i = 0; i < n; i++) {
      const row: any = { x: xArr[i], y: yArr[i] };
      if (series) row.series = series[i];
      if (sizes) row.size = sizes[i];
      rows.push(row);
    }
    return rows;
  }

  return [];
}

function arrLike(obj: any, keys: string[]): any[] | null {
  for (const k of keys) {
    if (Array.isArray(obj?.[k])) return obj[k];
  }
  return null;
}

/**
 * Normalize an array of rows: if rows already have `x`/`y`, keep as-is.
 * Otherwise auto-detect first string-ish key as `x`, first numeric key as `y`.
 */
function normalizeRows(rows: any[]): any[] {
  if (!rows.length) return rows;
  const first = rows[0];
  if (first && typeof first === 'object' && ('x' in first || 'y' in first)) return rows;
  if (first === null || typeof first !== 'object') return rows;

  const keys = Object.keys(first);
  let xKey = keys.find((k) => typeof first[k] === 'string');
  let yKey = keys.find((k) => typeof first[k] === 'number');
  if (!xKey && keys.length) xKey = keys[0];
  if (!yKey && keys.length > 1) yKey = keys[1];
  if (!xKey || !yKey) return rows;

  return rows.map((r) => ({ ...r, x: r[xKey!], y: r[yKey!] }));
}

/**
 * Render a visible error message inside `container` and return a no-op cleanup.
 * Used when widget input cannot be coerced into renderable data.
 */
export function renderEmpty(container: HTMLElement, widgetId: string, hint?: string): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — no data</strong><br>
      ${hint ?? "Pass <code>{x: [...], y: [...]}</code> or <code>{values: [{x, y}, ...]}</code> or <code>{data: [{...}]}</code>."}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/** Infer a Vega-Lite type (quantitative | nominal | ordinal | temporal). */
export function inferType(sample: any): string {
  if (sample instanceof Date) return 'temporal';
  if (typeof sample === 'number') return 'quantitative';
  if (typeof sample === 'string') {
    // ISO date heuristic
    if (/^\d{4}-\d{2}-\d{2}/.test(sample)) return 'temporal';
    return 'nominal';
  }
  return 'nominal';
}
