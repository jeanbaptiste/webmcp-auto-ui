// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-treemap', "Pass <code>{data:[{label, size, color?}]}</code> or hierarchical {children:[...]}");
  const { title, labelKey = 'label', sizeKey = 'size', colorKey = 'color' } = data as any;
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [{ type: 'treemap', labelKey, sizeKey, colorKey }],
  });
}
