// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { geojson, locations, z, colorscale = 'Viridis', title, featureidkey = 'properties.id', zoom = 3, center } = data as any;
  const traces = [{ type: 'choroplethmap', geojson, locations, z, colorscale, featureidkey }];
  const layout = { ...darkLayout(title), map: { style: 'dark', zoom, center: center || { lat: 0, lon: 0 } } };
  return plotly(container, traces, layout);
}
