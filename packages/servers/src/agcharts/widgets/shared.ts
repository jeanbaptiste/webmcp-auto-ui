// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared AG Charts (community) utilities
// — lazy load, theme-adaptive options, ResizeObserver, empty-data hint
// ---------------------------------------------------------------------------

let _ag: any = null;

/** Lazy-load ag-charts-community (single import, cached). */
export async function loadAg(): Promise<any> {
  if (_ag) return _ag;
  const mod = await import('ag-charts-community');
  _ag = (mod as any).AgCharts ?? (mod as any).default?.AgCharts ?? mod;
  return _ag;
}

/** Theme-adaptive overrides (mid-gray text, light grid — works on dark/light). */
export function baseTheme(): any {
  const text = '#666';
  const grid = '#ccc';
  return {
    baseTheme: 'ag-default',
    overrides: {
      common: {
        background: { fill: 'transparent' },
        title: { color: text, fontSize: 13, fontWeight: 'normal' },
        subtitle: { color: text },
        legend: { item: { label: { color: text } } },
        axes: {
          number: {
            label: { color: text },
            title: { color: text },
            line: { stroke: grid },
            tick: { stroke: grid },
            gridLine: { style: [{ stroke: grid, lineDash: [4, 2] }] },
          },
          category: {
            label: { color: text },
            title: { color: text },
            line: { stroke: grid },
            tick: { stroke: grid },
            gridLine: { style: [{ stroke: grid, lineDash: [4, 2] }] },
          },
          time: {
            label: { color: text },
            title: { color: text },
            line: { stroke: grid },
            tick: { stroke: grid },
            gridLine: { style: [{ stroke: grid, lineDash: [4, 2] }] },
          },
          log: {
            label: { color: text },
            title: { color: text },
            line: { stroke: grid },
            tick: { stroke: grid },
            gridLine: { style: [{ stroke: grid, lineDash: [4, 2] }] },
          },
        },
      },
    },
  };
}

/** Default color palette (works on dark & light bg). */
export const PALETTE = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666',
  '#73c0de', '#3ba272', '#fc8452', '#9a60b4',
  '#ea7ccc',
];

/**
 * Coerce inputs into `[{x, y, ...}]` rows. Mirrors vegalite's `toValues`.
 * Accepts:
 *   - {data: [...]}, {values: [...]}, {rows: [...]} → returned as-is
 *   - plain array
 *   - {x: [...], y: [...]} parallel arrays (with aliases)
 */
export function toRows(data: any): any[] {
  if (!data) return [];
  for (const k of ['data', 'values', 'rows']) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  if (Array.isArray(data)) return data;
  const xArr = arrLike(data, ['x', 'labels', 'categories', 'category', 'index', 'keys']);
  const yArr = arrLike(data, ['y', 'values', 'value', 'counts', 'count']);
  if (xArr && yArr) {
    const series = arrLike(data, ['series', 'group', 'groups']);
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
 * Render a visible empty-data hint inside `container`. Returns no-op cleanup.
 */
export function renderEmpty(container: HTMLElement, widgetId: string, hint?: string): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — no data</strong><br>
      ${hint ?? "Pass <code>{data: [{x, y}, ...]}</code> or <code>{x: [...], y: [...]}</code>."}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/**
 * Render an error hint (e.g. enterprise-only series type detected at runtime).
 */
export function renderError(container: HTMLElement, widgetId: string, message: string): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — error</strong><br>${message}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/**
 * Create an AG Chart in `container` with the given options merged with the
 * theme. Wires a ResizeObserver and returns a cleanup function.
 */
export async function agChart(
  container: HTMLElement,
  options: any,
): Promise<() => void> {
  const AgCharts = await loadAg();

  container.style.width = container.style.width || '100%';
  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '360px';

  const merged = {
    container,
    theme: baseTheme(),
    ...options,
  };

  let chart: any;
  try {
    chart = AgCharts.create(merged);
  } catch (err: any) {
    return renderError(container, 'agcharts', String(err?.message ?? err));
  }

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const ro = new ResizeObserver(() => {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      // AG Charts auto-resizes when container has dimensions; explicit
      // update is a no-op safety net for stubborn flex/grid reflows.
      try {
        chart.update?.(merged);
      } catch {
        // detached/disposed — ignore
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
      chart.destroy?.();
    } catch {
      // already destroyed
    }
  };
}
