// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, y, z, i, j, k, intensity, colorscale = 'Viridis', title, opacity = 0.8 } = data as any;
  const traces = [{ type: 'mesh3d', x, y, z, i, j, k, intensity, colorscale, opacity }];
  const layout = { ...darkLayout(title), scene: { xaxis: { color: '#ccc' }, yaxis: { color: '#ccc' }, zaxis: { color: '#ccc' } } };
  return plotly(container, traces, layout);
}
