// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared Plotly utilities — dark theme, config, lazy loading
// ---------------------------------------------------------------------------

import type Plotly from 'plotly.js-dist-min';

let _plotly: typeof Plotly | null = null;

/** Lazy-load plotly.js-dist-min (single import, cached). */
export async function loadPlotly(): Promise<typeof Plotly> {
  if (_plotly) return _plotly;
  _plotly = (await import('plotly.js-dist-min')) as typeof Plotly;
  return _plotly;
}

/** Dark-themed layout defaults. */
export function darkLayout(title?: string): Partial<Plotly.Layout> {
  return {
    title: title ? { text: title, font: { color: '#ccc' } } : undefined,
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: '#ccc' },
    margin: { t: title ? 40 : 10, r: 10, b: 40, l: 50 },
    legend: { font: { color: '#ccc' } },
  } as Partial<Plotly.Layout>;
}

/** Responsive Plotly config. */
export function responsiveConfig(): Partial<Plotly.Config> {
  return {
    responsive: true,
    displayModeBar: false,
  };
}
