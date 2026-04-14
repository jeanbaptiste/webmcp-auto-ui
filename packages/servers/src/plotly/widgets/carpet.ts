// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { a, b, x, y, title, carpet: carpetId = 'carpet1' } = data as any;
  const traces = [{ type: 'carpet', a, b, x, y, carpet: carpetId, aaxis: { color: '#ccc' }, baxis: { color: '#ccc' } }];
  return plotly(container, traces, { ...darkLayout(title) });
}
