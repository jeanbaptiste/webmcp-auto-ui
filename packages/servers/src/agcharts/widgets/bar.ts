// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-bar');
  const { title, xKey = 'x', yKey = 'y', xName, yName, stacked = false } = data as any;
  const seriesSpec: any = { type: 'bar', direction: 'horizontal', xKey, yKey };
  if (xName) seriesSpec.xName = xName;
  if (yName) seriesSpec.yName = yName;
  if (stacked) seriesSpec.stacked = true;
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [seriesSpec],
  });
}
