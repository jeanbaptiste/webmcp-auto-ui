// @ts-nocheck
import { plotly, darkLayout } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { ids, labels, parents, values, title, branchvalues = 'total' } = data as any;
  const traces = [{ type: 'icicle', ids, labels, parents, values, branchvalues }];
  return plotly(container, traces, { ...darkLayout(title) });
}
