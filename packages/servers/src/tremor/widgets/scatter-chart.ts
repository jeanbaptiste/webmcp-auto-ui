// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement, normalizeChartData, renderTremorEmpty } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container);
  const { ScatterChart } = await loadTremor();
  // ScatterChart takes `x` / `y` as field names (strings), not arrays.
  // If caller passed parallel arrays, normalize first.
  const norm = normalizeChartData(data);
  const rows = data.data ?? norm.data;
  if (!rows.length) return renderTremorEmpty(container, 'tremor-scatter-chart');
  const xField = typeof data.x === 'string' ? data.x : 'x';
  const yField = typeof data.y === 'string' ? data.y : 'y';
  const { category, size, colors, title, showLegend = true, showGridLines = true } = data;
  const children: any[] = [];
  if (title) children.push(createElement('h3', { className: 'text-lg font-semibold mb-2' }, title));
  children.push(createElement(ScatterChart, {
    data: rows, x: xField, y: yField, category, size, colors, showLegend, showGridLines,
    className: 'h-72',
  }));
  return mountReact(container, createElement('div', { className: 'p-4' }, ...children));
}
