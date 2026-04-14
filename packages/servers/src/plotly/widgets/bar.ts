// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, y, orientation = 'v', color, title, xLabel, yLabel, barmode = 'group' } = data as any;
  const traces = [{ type: 'bar', x, y, orientation, marker: { color } }];
  const layout = { ...darkLayout(title), barmode, xaxis: { title: xLabel, color: '#ccc', gridcolor: '#333' }, yaxis: { title: yLabel, color: '#ccc', gridcolor: '#333' } };
  return plotly(container, traces, layout);
}
