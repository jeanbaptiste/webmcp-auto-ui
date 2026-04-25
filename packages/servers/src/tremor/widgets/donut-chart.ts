// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement, normalizeChartData, renderTremorEmpty } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container);
  const { DonutChart, Legend } = await loadTremor();
  // Donut takes `data + index + category` (singular). Map from normalized
  // `{data, index, categories[0]}` for a sane default.
  const norm = normalizeChartData(data);
  const rows = norm.data;
  const index = data.index ?? norm.index;
  const category = data.category ?? norm.categories[0] ?? 'y';
  if (!rows.length) return renderTremorEmpty(container, 'tremor-donut-chart');
  const { colors, title, variant = 'donut', showLabel = true } = data;
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
