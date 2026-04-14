// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { dimensions, counts, title, arrangement = 'freeform' } = data as any;
  const traces = [{ type: 'parcats', dimensions, counts, arrangement, line: { color: '#1f77b4' } }];
  return plotly(container, traces, { ...darkLayout(title) });
}
