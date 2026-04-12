// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { y, x, name, title, boxpoints = 'outliers', notched = false } = data as any;
  const traces = Array.isArray(y[0])
    ? y.map((yi: number[], i: number) => ({ type: 'box', y: yi, name: name?.[i] || `Group ${i+1}`, boxpoints, notched }))
    : [{ type: 'box', y, x, name, boxpoints, notched }];
  return plotly(container, traces, { ...darkLayout(title) });
}
