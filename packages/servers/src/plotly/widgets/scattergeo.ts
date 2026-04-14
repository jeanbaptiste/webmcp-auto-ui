// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { lat, lon, text, mode = 'markers', markerSize = 6, color, title, projection = 'natural earth' } = data as any;
  const traces = [{ type: 'scattergeo', lat, lon, text, mode, marker: { size: markerSize, color } }];
  const layout = { ...darkLayout(title), geo: { projection: { type: projection }, bgcolor: 'transparent', landcolor: '#2a2a2a', oceancolor: '#111', showocean: true, showland: true, lakecolor: '#111' } };
  return plotly(container, traces, layout);
}
