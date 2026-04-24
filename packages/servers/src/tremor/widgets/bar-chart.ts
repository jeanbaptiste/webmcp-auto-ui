// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container);
  const { BarChart } = await loadTremor();
  const { data: rows, index, categories, colors, title, layout = 'vertical', stack = false, showLegend = true, showGridLines = true } = data;
  const children: any[] = [];
  if (title) children.push(createElement('h3', { className: 'text-lg font-semibold mb-2' }, title));
  children.push(createElement(BarChart, {
    data: rows, index, categories, colors, layout, stack, showLegend, showGridLines,
    className: 'h-72',
  }));
  return mountReact(container, createElement('div', { className: 'p-4' }, ...children));
}
