// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { values, labels, hole = 0, title, textinfo = 'percent+label' } = data as any;
  const traces = [{ type: 'pie', values, labels, hole, textinfo }];
  return plotly(container, traces, { ...darkLayout(title) });
}
