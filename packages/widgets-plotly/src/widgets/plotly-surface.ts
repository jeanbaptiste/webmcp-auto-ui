// @ts-nocheck
// ---------------------------------------------------------------------------
// plotly-surface — 3D surface plot
// ---------------------------------------------------------------------------

import { darkLayout, responsiveConfig, loadPlotly } from '../plotly-utils.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<() => void> {
  const Plotly = await loadPlotly();

  const z = data.z as number[][];
  const colorscale = (data.colorscale as string) ?? 'Viridis';
  const showContours = (data.showContours as boolean) ?? false;

  const trace: Plotly.Data = {
    z,
    type: 'surface',
    colorscale,
    contours: showContours
      ? {
          z: { show: true, usecolormap: true, highlightcolor: '#fff', project: { z: true } },
        }
      : undefined,
  } as Record<string, unknown>;

  if (data.x) (trace as Record<string, unknown>).x = data.x;
  if (data.y) (trace as Record<string, unknown>).y = data.y;

  const layout: Record<string, unknown> = {
    ...darkLayout(data.title as string | undefined),
    scene: {
      xaxis: { title: (data.xLabel as string) ?? '', color: '#ccc', gridcolor: '#333' },
      yaxis: { title: (data.yLabel as string) ?? '', color: '#ccc', gridcolor: '#333' },
      zaxis: { title: (data.zLabel as string) ?? '', color: '#ccc', gridcolor: '#333' },
    } as Record<string, unknown>['scene'],
  };

  Plotly.newPlot(container, [trace], layout, responsiveConfig());

  return () => Plotly.purge(container);
}
