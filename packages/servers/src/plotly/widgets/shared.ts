// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared Plotly utilities — dark theme, config, lazy loading
// ---------------------------------------------------------------------------

let _plotly: any = null;

/** Lazy-load plotly.js-dist-min (single import, cached). */
export async function loadPlotly(): Promise<any> {
  if (_plotly) return _plotly;
  const mod = await import('plotly.js-dist-min');
  _plotly = mod.default ?? mod;
  return _plotly;
}

/**
 * Theme-adaptive layout defaults.
 *
 * Plotly's config does not support CSS variables for colors, so we use a
 * mid-gray (#666) for text that yields acceptable contrast on both light
 * and dark backgrounds, and a light gray (#ccc) for grids (visible on
 * white, discreet on dark).
 */
export function darkLayout(title?: string): any {
  const textColor = '#666';
  const gridColor = '#ccc';
  return {
    title: title ? { text: title, font: { color: textColor } } : undefined,
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: textColor, size: 11 },
    margin: { t: title ? 40 : 10, r: 10, b: 40, l: 50 },
    legend: { font: { color: textColor } },
    xaxis: { gridcolor: gridColor, zerolinecolor: gridColor, tickfont: { color: textColor } },
    yaxis: { gridcolor: gridColor, zerolinecolor: gridColor, tickfont: { color: textColor } },
  };
}

/** Responsive Plotly config. */
export function responsiveConfig(): any {
  return {
    responsive: true,
    displayModeBar: false,
  };
}

/** Convenience: render traces with dark layout into container, return cleanup fn. */
export async function plotly(
  container: HTMLElement,
  traces: any[],
  layout?: any,
  config?: any,
): Promise<() => void> {
  const Plotly = await loadPlotly();
  const mergedLayout = { ...darkLayout(layout?.title), ...layout };
  const mergedConfig = { ...responsiveConfig(), ...config };
  await Plotly.newPlot(container, traces, mergedLayout, mergedConfig);

  // Plotly's `responsive: true` only listens to window.resize — it doesn't
  // react to container size changes (e.g. flex/grid reflow, sidebar toggle,
  // widget panel resize). Wire a ResizeObserver with a small debounce.
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const ro = new ResizeObserver(() => {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      try {
        Plotly.Plots.resize(container);
      } catch {
        // container may have been detached — ignore
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
    Plotly.purge(container);
  };
}
