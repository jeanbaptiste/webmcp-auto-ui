// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { z, x, y, colorscale = 'Viridis', title, showscale = true } = data as any;
  const traces = [{ type: 'surface', z, x, y, colorscale, showscale }];
  const layout = { ...darkLayout(title), scene: { xaxis: { color: '#ccc', gridcolor: '#333' }, yaxis: { color: '#ccc', gridcolor: '#333' }, zaxis: { color: '#ccc', gridcolor: '#333' } } };
  return plotly(container, traces, layout);
}
