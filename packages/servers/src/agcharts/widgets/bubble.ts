// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-bubble');
  const { title, xKey = 'x', yKey = 'y', sizeKey = 'size' } = data as any;
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [{ type: 'bubble', xKey, yKey, sizeKey }],
    axes: [
      { type: 'number', position: 'bottom' },
      { type: 'number', position: 'left' },
    ],
  });
}
