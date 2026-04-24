// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared Observable Plot utilities — lazy loading, theme, ResizeObserver
// ---------------------------------------------------------------------------

let _plot: any = null;

/** Lazy-load @observablehq/plot (single import, cached). */
export async function loadPlot(): Promise<any> {
  if (_plot) return _plot;
  const mod = await import('@observablehq/plot');
  _plot = mod.default ?? mod;
  return _plot;
}

/**
 * Theme-adaptive style defaults for Plot.
 * Plot accepts a `style` option (CSS-like) and color options on axes.
 * We use a mid-gray to keep legibility on both light and dark backgrounds.
 */
export function plotStyle(extra?: any): any {
  return {
    background: 'transparent',
    color: '#666',
    fontSize: '11px',
    ...extra,
  };
}

/**
 * Render a Plot spec into `container`. Re-renders on container resize because
 * Plot does not have a native resize mechanism — we must call `Plot.plot` again
 * with an updated `width`.
 *
 * Returns a cleanup function that removes the SVG and disconnects the observer.
 */
export async function renderPlot(
  container: HTMLElement,
  buildSpec: (width: number, height: number) => any,
): Promise<() => void> {
  const Plot = await loadPlot();

  container.style.width = container.style.width || '100%';
  container.style.minHeight = container.style.minHeight || '300px';

  let current: any = null;

  const draw = () => {
    const rect = container.getBoundingClientRect();
    const width = Math.max(200, Math.floor(rect.width || container.clientWidth || 640));
    const height = Math.max(200, Math.floor(rect.height || container.clientHeight || 400));
    const spec = buildSpec(width, height);
    // Ensure style + width are applied
    const merged = {
      width,
      height,
      ...spec,
      style: plotStyle(spec.style),
    };
    const node = Plot.plot(merged);
    if (current && current.parentNode === container) container.removeChild(current);
    container.appendChild(node);
    current = node;
  };

  draw();

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const ro = new ResizeObserver(() => {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      try {
        draw();
      } catch {
        // container may be detached — ignore
      }
    }, 50);
  });
  ro.observe(container);

  return () => {
    ro.disconnect();
    if (resizeTimer !== null) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }
    try {
      if (current && current.parentNode === container) container.removeChild(current);
    } catch {
      // ignore
    }
    current = null;
  };
}

/**
 * Helper: pick Plot options common to most marks from a data dict.
 * Accepts `xLabel`, `yLabel`, `title`, `grid`, `marginLeft`, `marginBottom`.
 */
export function commonOpts(data: any): any {
  const opts: any = {};
  if (data.title) opts.title = data.title;
  if (data.subtitle) opts.subtitle = data.subtitle;
  if (data.caption) opts.caption = data.caption;
  if (data.grid !== undefined) opts.grid = data.grid;
  if (data.marginLeft !== undefined) opts.marginLeft = data.marginLeft;
  if (data.marginRight !== undefined) opts.marginRight = data.marginRight;
  if (data.marginTop !== undefined) opts.marginTop = data.marginTop;
  if (data.marginBottom !== undefined) opts.marginBottom = data.marginBottom;
  if (data.xLabel !== undefined || data.xDomain !== undefined) {
    opts.x = { label: data.xLabel, domain: data.xDomain };
  }
  if (data.yLabel !== undefined || data.yDomain !== undefined) {
    opts.y = { label: data.yLabel, domain: data.yDomain };
  }
  if (data.color !== undefined) opts.color = data.color;
  return opts;
}

/**
 * Data helper — accept either an array of objects or parallel arrays {x, y}.
 * Returns an array of objects ready for Plot marks.
 */
export function zipData(data: any): any[] {
  if (Array.isArray(data?.data)) return data.data;
  const out: any[] = [];
  const keys: string[] = [];
  const arrays: Record<string, any[]> = {};
  for (const k of Object.keys(data)) {
    if (Array.isArray(data[k])) {
      keys.push(k);
      arrays[k] = data[k];
    }
  }
  if (keys.length === 0) return [];
  const len = Math.min(...keys.map((k) => arrays[k].length));
  for (let i = 0; i < len; i++) {
    const row: any = {};
    for (const k of keys) row[k] = arrays[k][i];
    out.push(row);
  }
  return out;
}
