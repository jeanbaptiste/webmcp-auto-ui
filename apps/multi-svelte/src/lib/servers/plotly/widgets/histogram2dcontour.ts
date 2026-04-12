// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, y, ncontours, colorscale = 'Hot', title } = data as any;
  const traces = [{ type: 'histogram2dcontour', x, y, ncontours, colorscale }];
  return plotly(container, traces, { ...darkLayout(title) });
}
