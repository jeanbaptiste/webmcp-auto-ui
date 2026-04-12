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

/** Dark-themed layout defaults. */
export function darkLayout(title?: string): any {
  return {
    title: title ? { text: title, font: { color: '#ccc' } } : undefined,
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: '#ccc', size: 11 },
    margin: { t: title ? 40 : 10, r: 10, b: 40, l: 50 },
    legend: { font: { color: '#ccc' } },
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
  return () => { Plotly.purge(container); };
}
