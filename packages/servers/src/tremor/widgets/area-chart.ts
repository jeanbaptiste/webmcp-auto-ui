// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container);
  const { AreaChart } = await loadTremor();
  const { data: rows, index, categories, colors, valueFormatter, title, showLegend = true, showGridLines = true, curveType = 'linear', stack = false } = data;
  const children: any[] = [];
  if (title) children.push(createElement('h3', { className: 'text-lg font-semibold mb-2' }, title));
  children.push(createElement(AreaChart, {
    data: rows, index, categories, colors, showLegend, showGridLines, curveType, stack,
    className: 'h-72',
  }));
  return mountReact(container, createElement('div', { className: 'p-4' }, ...children));
}
