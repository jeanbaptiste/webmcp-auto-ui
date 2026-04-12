// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { r, theta, mode = 'markers', markerSize = 4, color, title } = data as any;
  const traces = [{ type: 'scatterpolargl', r, theta, mode, marker: { size: markerSize, color } }];
  const layout = { ...darkLayout(title), polar: { bgcolor: 'transparent', radialaxis: { color: '#ccc', gridcolor: '#333' }, angularaxis: { color: '#ccc', gridcolor: '#333' } } };
  return plotly(container, traces, layout);
}
