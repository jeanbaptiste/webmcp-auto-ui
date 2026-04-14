// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { dimensions, text, markerSize = 4, color, title } = data as any;
  const traces = [{ type: 'splom', dimensions, text, marker: { size: markerSize, color } }];
  return plotly(container, traces, { ...darkLayout(title) });
}
