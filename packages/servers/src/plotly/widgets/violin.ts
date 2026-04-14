// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { y, x, name, title, box = true, meanline = true, points = 'outliers' } = data as any;
  const traces = Array.isArray(y[0])
    ? y.map((yi: number[], i: number) => ({ type: 'violin', y: yi, name: name?.[i] || `Group ${i+1}`, box: { visible: box }, meanline: { visible: meanline }, points }))
    : [{ type: 'violin', y, x, name, box: { visible: box }, meanline: { visible: meanline }, points }];
  return plotly(container, traces, { ...darkLayout(title) });
}
