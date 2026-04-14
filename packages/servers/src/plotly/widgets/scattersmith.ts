// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { real, imag, mode = 'markers', text, markerSize = 8, title } = data as any;
  const traces = [{ type: 'scattersmith', real, imag, mode, text, marker: { size: markerSize } }];
  const layout = { ...darkLayout(title), smith: { bgcolor: 'transparent' } };
  return plotly(container, traces, layout);
}
