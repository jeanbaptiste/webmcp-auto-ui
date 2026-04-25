// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-area');
  const { title, xKey = 'x', yKey = 'y', stacked = false, fillOpacity = 0.6 } = data as any;
  const seriesSpec: any = { type: 'area', xKey, yKey, fillOpacity };
  if (stacked) seriesSpec.stacked = true;
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [seriesSpec],
  });
}
