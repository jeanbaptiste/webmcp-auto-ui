// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, y, z, value, isomin, isomax, opacity = 0.1, surface = true, colorscale = 'RdBu', title } = data as any;
  const traces = [{ type: 'volume', x, y, z, value, isomin, isomax, opacity, surface: { show: surface }, colorscale }];
  const layout = { ...darkLayout(title), scene: { xaxis: { color: '#ccc' }, yaxis: { color: '#ccc' }, zaxis: { color: '#ccc' } } };
  return plotly(container, traces, layout);
}
