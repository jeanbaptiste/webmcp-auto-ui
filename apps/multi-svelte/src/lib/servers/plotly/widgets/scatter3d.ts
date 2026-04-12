// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, y, z, mode = 'markers', markerSize = 4, color, title } = data as any;
  const traces = [{ type: 'scatter3d', x, y, z, mode, marker: { size: markerSize, color } }];
  const layout = { ...darkLayout(title), scene: { xaxis: { color: '#ccc', gridcolor: '#333' }, yaxis: { color: '#ccc', gridcolor: '#333' }, zaxis: { color: '#ccc', gridcolor: '#333' } } };
  return plotly(container, traces, layout);
}
