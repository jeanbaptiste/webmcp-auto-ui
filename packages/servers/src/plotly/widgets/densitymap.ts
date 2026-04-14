// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { lat, lon, z, radius = 10, colorscale = 'Hot', title, zoom = 3, center } = data as any;
  const traces = [{ type: 'densitymap', lat, lon, z, radius, colorscale }];
  const layout = { ...darkLayout(title), map: { style: 'dark', zoom, center: center || { lat: (lat[0] || 0), lon: (lon[0] || 0) } } };
  return plotly(container, traces, layout);
}
