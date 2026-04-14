// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { r, theta, title, color, opacity = 0.8 } = data as any;
  const traces = [{ type: 'barpolar', r, theta, marker: { color, opacity } }];
  const layout = { ...darkLayout(title), polar: { bgcolor: 'transparent', radialaxis: { color: '#ccc', gridcolor: '#333' }, angularaxis: { color: '#ccc', gridcolor: '#333' } } };
  return plotly(container, traces, layout);
}
