// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { z, x, y, colorscale = 'Viridis', title, showscale = true } = data as any;
  const traces = [{ type: 'heatmapgl', z, x, y, colorscale, showscale }];
  return plotly(container, traces, { ...darkLayout(title) });
}
