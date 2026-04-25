// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-heatmap', "Pass <code>{data:[{x, y, value}]}</code>");
  const { title, xKey = 'x', yKey = 'y', colorKey = 'value' } = data as any;
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [{ type: 'heatmap', xKey, yKey, colorKey }],
  });
}
