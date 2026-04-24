// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container);
  const { DonutChart, Legend } = await loadTremor();
  const { data: rows, index, category, colors, title, variant = 'donut', showLabel = true } = data;
  const children: any[] = [];
  if (title) children.push(createElement('h3', { className: 'text-lg font-semibold mb-2' }, title));
  children.push(createElement(DonutChart, {
    data: rows, index, category, colors, variant, showLabel,
    className: 'h-64',
  }));
  if (rows && index) {
    const categories = rows.map((r: any) => r[index]);
    children.push(createElement(Legend, { categories, colors, className: 'mt-4 justify-center' }));
  }
  return mountReact(container, createElement('div', { className: 'p-4' }, ...children));
}
