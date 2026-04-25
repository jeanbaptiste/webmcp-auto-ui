// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-histogram', "Pass <code>{data:[{x:1},{x:2},...]}</code>");
  const { title, xKey = 'x', bins } = data as any;
  const seriesSpec: any = { type: 'histogram', xKey };
  if (Array.isArray(bins)) seriesSpec.bins = bins;
  else if (typeof bins === 'number') seriesSpec.binCount = bins;
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [seriesSpec],
  });
}
