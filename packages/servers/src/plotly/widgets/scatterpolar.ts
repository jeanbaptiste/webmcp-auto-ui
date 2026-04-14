// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { r, theta, mode = 'lines+markers', fill = 'toself', title, name } = data as any;
  const traces = [{ type: 'scatterpolar', r, theta, mode, fill, name }];
  const layout = { ...darkLayout(title), polar: { bgcolor: 'transparent', radialaxis: { color: '#ccc', gridcolor: '#333' }, angularaxis: { color: '#ccc', gridcolor: '#333' } } };
  return plotly(container, traces, layout);
}
