// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { z, title, colormodel = 'rgb' } = data as any;
  const traces = [{ type: 'image', z, colormodel }];
  return plotly(container, traces, { ...darkLayout(title) });
}
