// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-scatter');
  const { title, xKey = 'x', yKey = 'y', xName, yName } = data as any;
  const seriesSpec: any = { type: 'scatter', xKey, yKey };
  if (xName) seriesSpec.xName = xName;
  if (yName) seriesSpec.yName = yName;
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [seriesSpec],
    axes: [
      { type: 'number', position: 'bottom' },
      { type: 'number', position: 'left' },
    ],
  });
}
