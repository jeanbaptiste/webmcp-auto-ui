// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-candlestick', "Pass <code>{data:[{date, open, high, low, close}]}</code>");
  const {
    title,
    xKey = 'date',
    openKey = 'open',
    highKey = 'high',
    lowKey = 'low',
    closeKey = 'close',
  } = data as any;
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [{ type: 'candlestick', xKey, openKey, highKey, lowKey, closeKey }],
  });
}
