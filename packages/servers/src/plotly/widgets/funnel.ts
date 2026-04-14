// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, y, title, textinfo = 'value+percent initial' } = data as any;
  const traces = [{ type: 'funnel', x, y, textinfo }];
  return plotly(container, traces, { ...darkLayout(title) });
}
