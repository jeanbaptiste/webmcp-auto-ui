// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, y, mode = 'markers', text, markerSize = 4, color, title, xLabel, yLabel } = data as any;
  const traces = [{ type: 'scattergl', x, y, mode, text, marker: { size: markerSize, color } }];
  const layout = { ...darkLayout(title), xaxis: { title: xLabel, color: '#ccc', gridcolor: '#333' }, yaxis: { title: yLabel, color: '#ccc', gridcolor: '#333' } };
  return plotly(container, traces, layout);
}
