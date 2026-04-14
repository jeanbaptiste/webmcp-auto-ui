// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, y, measure, title, connector = { line: { color: '#666' } } } = data as any;
  const traces = [{ type: 'waterfall', x, y, measure, connector, textposition: 'outside' }];
  return plotly(container, traces, { ...darkLayout(title) });
}
