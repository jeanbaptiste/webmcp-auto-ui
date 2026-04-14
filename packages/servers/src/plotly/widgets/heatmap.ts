// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { z, x, y, colorscale = 'Viridis', title, xLabel, yLabel, showscale = true } = data as any;
  const traces = [{ type: 'heatmap', z, x, y, colorscale, showscale }];
  const layout = { ...darkLayout(title), xaxis: { title: xLabel, color: '#ccc' }, yaxis: { title: yLabel, color: '#ccc' } };
  return plotly(container, traces, layout);
}
