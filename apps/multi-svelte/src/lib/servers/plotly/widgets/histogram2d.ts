// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { x, y, nbinsx, nbinsy, colorscale = 'Viridis', title } = data as any;
  const traces = [{ type: 'histogram2d', x, y, nbinsx, nbinsy, colorscale }];
  return plotly(container, traces, { ...darkLayout(title) });
}
