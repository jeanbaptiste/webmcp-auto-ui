// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, nbinsx, title, xLabel, yLabel, histnorm, cumulative = false } = data as any;
  const traces = [{ type: 'histogram', x, nbinsx, histnorm, cumulative: { enabled: cumulative } }];
  const layout = { ...darkLayout(title), xaxis: { title: xLabel, color: '#ccc', gridcolor: '#333' }, yaxis: { title: yLabel, color: '#ccc', gridcolor: '#333' } };
  return plotly(container, traces, layout);
}
