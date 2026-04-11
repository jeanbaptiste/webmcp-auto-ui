// @ts-nocheck
// ---------------------------------------------------------------------------
// plotly-histogram — Histogram from raw values
// ---------------------------------------------------------------------------

import { darkLayout, responsiveConfig, loadPlotly } from '../plotly-utils.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<() => void> {
  const Plotly = await loadPlotly();

  const values = data.values as number[];
  const color = (data.color as string) ?? '#636efa';
  const cumulative = (data.cumulative as boolean) ?? false;
  const histnorm = (data.histnorm as string) ?? '';

  const trace: Plotly.Data = {
    x: values,
    type: 'histogram',
    marker: { color },
    cumulative: { enabled: cumulative },
  } as Plotly.Data;

  if (data.nbins) (trace as Record<string, unknown>).nbinsx = data.nbins;
  if (histnorm) (trace as Record<string, unknown>).histnorm = histnorm;

  const layout: Partial<Plotly.Layout> = {
    ...darkLayout(data.title as string | undefined),
    xaxis: { title: (data.xLabel as string) ?? '', color: '#ccc', gridcolor: '#333' },
    yaxis: { title: (data.yLabel as string) ?? 'Count', color: '#ccc', gridcolor: '#333' },
    bargap: 0.05,
  };

  Plotly.newPlot(container, [trace], layout, responsiveConfig());

  return () => Plotly.purge(container);
}
