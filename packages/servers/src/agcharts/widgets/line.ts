// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-line');
  const { title, xKey = 'x', yKey = 'y', xName, yName, smooth = false, marker = true } = data as any;
  const seriesSpec: any = { type: 'line', xKey, yKey };
  if (xName) seriesSpec.xName = xName;
  if (yName) seriesSpec.yName = yName;
  if (smooth) seriesSpec.interpolation = { type: 'smooth' };
  seriesSpec.marker = { enabled: !!marker };
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [seriesSpec],
  });
}
