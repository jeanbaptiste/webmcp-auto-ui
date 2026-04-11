// @ts-nocheck
// ---------------------------------------------------------------------------
// plotly-box — Box plot for comparing distributions
// ---------------------------------------------------------------------------

import { darkLayout, responsiveConfig, loadPlotly } from '../plotly-utils.js';

interface Series {
  label: string;
  values: number[];
  color?: string;
}

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<() => void> {
  const Plotly = await loadPlotly();

  const series = data.series as Series[];
  const horizontal = (data.horizontal as boolean) ?? false;
  const showPoints = (data.showPoints as string) ?? 'outliers';

  const traces: Plotly.Data[] = series.map(s => {
    const base: Record<string, unknown> = {
      type: 'box',
      name: s.label,
      boxpoints: showPoints,
      marker: s.color ? { color: s.color } : undefined,
    };

    if (horizontal) {
      base.x = s.values;
    } else {
      base.y = s.values;
    }

    return base as Plotly.Data;
  });

  const layout: Partial<Plotly.Layout> = {
    ...darkLayout(data.title as string | undefined),
    xaxis: { title: (data.xLabel as string) ?? '', color: '#ccc', gridcolor: '#333' },
    yaxis: { title: (data.yLabel as string) ?? '', color: '#ccc', gridcolor: '#333' },
  };

  Plotly.newPlot(container, traces, layout, responsiveConfig());

  return () => Plotly.purge(container);
}
