// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { a, b, c, mode = 'markers', text, markerSize = 8, title } = data as any;
  const traces = [{ type: 'scatterternary', a, b, c, mode, text, marker: { size: markerSize } }];
  const layout = { ...darkLayout(title), ternary: { bgcolor: 'transparent', aaxis: { color: '#ccc', gridcolor: '#333' }, baxis: { color: '#ccc', gridcolor: '#333' }, caxis: { color: '#ccc', gridcolor: '#333' } } };
  return plotly(container, traces, layout);
}
