// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { z, x, y, colorscale = 'Viridis', title, ncontours, showlabels = true } = data as any;
  const traces = [{ type: 'contour', z, x, y, colorscale, ncontours, contours: { showlabels } }];
  return plotly(container, traces, { ...darkLayout(title) });
}
