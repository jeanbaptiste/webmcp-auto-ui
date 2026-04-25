// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-box-plot', "Pass <code>{data:[{x, min, q1, median, q3, max}]}</code>");
  const {
    title,
    xKey = 'x',
    minKey = 'min',
    q1Key = 'q1',
    medianKey = 'median',
    q3Key = 'q3',
    maxKey = 'max',
  } = data as any;
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [{ type: 'box-plot', xKey, minKey, q1Key, medianKey, q3Key, maxKey }],
  });
}
