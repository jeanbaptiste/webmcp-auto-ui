// @ts-nocheck
// ---------------------------------------------------------------------------
// plotly-violin — Violin plot (distribution shape per category)
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
  const showBox = (data.showBox as boolean) ?? true;
  const showMeanline = (data.showMeanline as boolean) ?? false;

  const traces: Record<string, unknown>[] = series.map(s => {
    const base: Record<string, unknown> = {
      type: 'violin',
      name: s.label,
      box: { visible: showBox },
      meanline: { visible: showMeanline },
      fillcolor: s.color,
      line: { color: s.color },
    };

    if (horizontal) {
      base.x = s.values;
    } else {
      base.y = s.values;
    }

    return base;
  });

  const layout: Record<string, unknown> = {
    ...darkLayout(data.title as string | undefined),
    xaxis: { title: (data.xLabel as string) ?? '', color: '#ccc', gridcolor: '#333' },
    yaxis: { title: (data.yLabel as string) ?? '', color: '#ccc', gridcolor: '#333' },
  };

  Plotly.newPlot(container, traces, layout, responsiveConfig());

  return () => Plotly.purge(container);
}
