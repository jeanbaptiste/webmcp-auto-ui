// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, y, z, u, v, w, colorscale = 'Blues', title, sizemode = 'absolute' } = data as any;
  const traces = [{ type: 'cone', x, y, z, u, v, w, colorscale, sizemode }];
  const layout = { ...darkLayout(title), scene: { xaxis: { color: '#ccc' }, yaxis: { color: '#ccc' }, zaxis: { color: '#ccc' } } };
  return plotly(container, traces, layout);
}
