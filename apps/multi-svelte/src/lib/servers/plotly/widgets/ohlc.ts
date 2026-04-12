// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, open, high, low, close, title } = data as any;
  const traces = [{ type: 'ohlc', x, open, high, low, close }];
  const layout = { ...darkLayout(title), xaxis: { rangeslider: { visible: false }, color: '#ccc' }, yaxis: { color: '#ccc', gridcolor: '#333' } };
  return plotly(container, traces, layout);
}
