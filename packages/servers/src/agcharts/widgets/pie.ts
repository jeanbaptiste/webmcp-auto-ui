// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-pie');
  const { title, angleKey = 'y', labelKey = 'x' } = data as any;
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [{ type: 'pie', angleKey, calloutLabelKey: labelKey, legendItemKey: labelKey }],
  });
}
