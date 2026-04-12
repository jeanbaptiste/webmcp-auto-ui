// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { values, labels, title, textinfo = 'percent+label' } = data as any;
  const traces = [{ type: 'funnelarea', values, labels, textinfo }];
  return plotly(container, traces, { ...darkLayout(title) });
}
