// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, y, z, value, isomin, isomax, colorscale = 'BlueRed', title, opacity = 0.6, caps } = data as any;
  const traces = [{ type: 'isosurface', x, y, z, value, isomin, isomax, colorscale, opacity, caps: caps || { x: { show: false }, y: { show: false }, z: { show: false } } }];
  const layout = { ...darkLayout(title), scene: { xaxis: { color: '#ccc' }, yaxis: { color: '#ccc' }, zaxis: { color: '#ccc' } } };
  return plotly(container, traces, layout);
}
