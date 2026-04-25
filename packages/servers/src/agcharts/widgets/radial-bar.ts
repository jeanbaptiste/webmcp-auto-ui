// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-radial-bar');
  const { title, angleKey = 'y', categoryKey = 'x' } = data as any;
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [{ type: 'radial-bar', angleKey, radiusKey: categoryKey }],
  });
}
