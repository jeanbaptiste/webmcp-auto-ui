// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { value, title, mode = 'gauge+number+delta', delta, gauge } = data as any;
  const traces = [{
    type: 'indicator',
    mode,
    value,
    title: { text: title || '', font: { color: '#ccc' } },
    delta: delta ? { reference: delta.reference } : undefined,
    gauge: gauge || { axis: { range: [0, 100], tickcolor: '#ccc' }, bar: { color: '#1f77b4' }, bgcolor: '#1a1a1a', bordercolor: '#333' },
  }];
  return plotly(container, traces, { ...darkLayout(), margin: { t: 10, r: 25, b: 10, l: 25 } });
}
