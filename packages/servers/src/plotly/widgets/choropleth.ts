// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { locations, z, locationmode = 'ISO-3', colorscale = 'Viridis', title, text } = data as any;
  const traces = [{ type: 'choropleth', locations, z, locationmode, colorscale, text, colorbar: { tickfont: { color: '#ccc' } } }];
  const layout = { ...darkLayout(title), geo: { bgcolor: 'transparent', landcolor: '#2a2a2a', showocean: true, oceancolor: '#111', lakecolor: '#111', projection: { type: 'natural earth' } } };
  return plotly(container, traces, layout);
}
