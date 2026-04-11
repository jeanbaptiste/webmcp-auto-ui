// @ts-nocheck
// ---------------------------------------------------------------------------
// plotly-parallel — Parallel coordinates plot
// ---------------------------------------------------------------------------

import { darkLayout, responsiveConfig, loadPlotly } from '../plotly-utils.js';

interface Dimension {
  label: string;
  values: number[];
  range?: [number, number];
}

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<() => void> {
  const Plotly = await loadPlotly();

  const dimensions = data.dimensions as Dimension[];
  const colorValues = data.colorValues as number[] | undefined;
  const colorLabel = (data.colorLabel as string) ?? '';
  const colorscale = (data.colorscale as string) ?? 'Viridis';

  const plotlyDims = dimensions.map(d => ({
    label: d.label,
    values: d.values,
    range: d.range ?? [Math.min(...d.values), Math.max(...d.values)],
  }));

  const line: Record<string, unknown> = { color: '#636efa' };
  if (colorValues) {
    line.color = colorValues;
    line.colorscale = colorscale;
    line.showscale = true;
    line.colorbar = { title: colorLabel, tickfont: { color: '#ccc' }, titlefont: { color: '#ccc' } };
  }

  const trace = {
    type: 'parcoords',
    line,
    dimensions: plotlyDims,
  } as Plotly.Data;

  const layout: Partial<Plotly.Layout> = {
    ...darkLayout(data.title as string | undefined),
  };

  Plotly.newPlot(container, [trace], layout, responsiveConfig());

  return () => Plotly.purge(container);
}
