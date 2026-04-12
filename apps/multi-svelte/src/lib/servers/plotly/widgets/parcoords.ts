// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { dimensions, lineColor, title, colorscale = 'Viridis' } = data as any;
  const traces = [{ type: 'parcoords', dimensions, line: { color: lineColor, colorscale } }];
  return plotly(container, traces, { ...darkLayout(title) });
}
