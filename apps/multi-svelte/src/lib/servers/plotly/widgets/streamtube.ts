// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, y, z, u, v, w, colorscale = 'Portland', title, maxdisplayed = 3000 } = data as any;
  const traces = [{ type: 'streamtube', x, y, z, u, v, w, colorscale, maxdisplayed }];
  const layout = { ...darkLayout(title), scene: { xaxis: { color: '#ccc' }, yaxis: { color: '#ccc' }, zaxis: { color: '#ccc' } } };
  return plotly(container, traces, layout);
}
