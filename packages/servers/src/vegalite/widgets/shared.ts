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
): Promise<() => void> {
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
 * Convert a tabular `{x, y, series?}` or `{values: [...]}` shape into a
 * Vega-Lite `data` object. Accepts either pre-built `values` arrays or
 * parallel x/y arrays that get zipped.
 */
export function toValues(data: any): any[] {
  if (Array.isArray(data?.values)) return data.values;
  if (Array.isArray(data?.x) && Array.isArray(data?.y)) {
    const { x, y, series } = data;
    const n = Math.min(x.length, y.length);
    const rows: any[] = [];
    for (let i = 0; i < n; i++) {
      const row: any = { x: x[i], y: y[i] };
      if (Array.isArray(series)) row.series = series[i];
      rows.push(row);
    }
    return rows;
  }
  return [];
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
