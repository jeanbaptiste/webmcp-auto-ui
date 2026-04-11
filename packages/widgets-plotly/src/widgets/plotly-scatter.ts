// @ts-nocheck
// ---------------------------------------------------------------------------
// plotly-scatter — Scatter plot (2D / 3D)
// ---------------------------------------------------------------------------

import { darkLayout, responsiveConfig, loadPlotly } from '../plotly-utils.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<() => void> {
  const Plotly = await loadPlotly();

  const x = data.x as number[];
  const y = data.y as number[];
  const z = data.z as number[] | undefined;
  const categories = data.categories as string[] | undefined;
  const mode = (data.mode as string) ?? 'markers';
  const markerSize = (data.markerSize as number) ?? 6;
  const is3d = Array.isArray(z) && z.length > 0;

  // Build traces — one per category (or a single trace if no categories)
  const traces: Plotly.Data[] = [];

  if (categories) {
    const unique = [...new Set(categories)];
    for (const cat of unique) {
      const idx = categories.map((c, i) => (c === cat ? i : -1)).filter(i => i >= 0);
      const trace: Plotly.Data = {
        x: idx.map(i => x[i]),
        y: idx.map(i => y[i]),
        mode: mode as Plotly.Data['mode'],
        type: is3d ? 'scatter3d' : 'scatter',
        name: cat,
        marker: { size: markerSize },
      };
      if (is3d) (trace as Record<string, unknown>).z = idx.map(i => z![i]);
      traces.push(trace);
    }
  } else {
    const trace: Plotly.Data = {
      x,
      y,
      mode: mode as Plotly.Data['mode'],
      type: is3d ? 'scatter3d' : 'scatter',
      marker: { size: markerSize },
    };
    if (is3d) (trace as Record<string, unknown>).z = z;
    traces.push(trace);
  }

  const layout: Partial<Plotly.Layout> = {
    ...darkLayout(data.title as string | undefined),
    xaxis: { title: (data.xLabel as string) ?? '', color: '#ccc', gridcolor: '#333' },
    yaxis: { title: (data.yLabel as string) ?? '', color: '#ccc', gridcolor: '#333' },
  };

  if (is3d) {
    (layout as Record<string, unknown>).scene = {
      xaxis: { title: (data.xLabel as string) ?? '', color: '#ccc', gridcolor: '#333' },
      yaxis: { title: (data.yLabel as string) ?? '', color: '#ccc', gridcolor: '#333' },
      zaxis: { title: (data.zLabel as string) ?? '', color: '#ccc', gridcolor: '#333' },
    };
  }

  Plotly.newPlot(container, traces, layout, responsiveConfig());

  return () => Plotly.purge(container);
}
