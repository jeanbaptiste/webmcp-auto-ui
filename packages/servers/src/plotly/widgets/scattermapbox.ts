// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { lat, lon, text, mode = 'markers', markerSize = 8, color, title, zoom = 3, center } = data as any;
  const traces = [{ type: 'scattermapbox', lat, lon, text, mode, marker: { size: markerSize, color } }];
  const layout = { ...darkLayout(title), mapbox: { style: 'carto-darkmatter', zoom, center: center || { lat: (lat[0] || 0), lon: (lon[0] || 0) } } };
  return plotly(container, traces, layout);
}
