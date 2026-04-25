// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-range-area', "Pass <code>{data:[{x, low, high}]}</code>");
  const { title, xKey = 'x', yLowKey = 'low', yHighKey = 'high' } = data as any;
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [{ type: 'range-area', xKey, yLowKey, yHighKey }],
  });
}
