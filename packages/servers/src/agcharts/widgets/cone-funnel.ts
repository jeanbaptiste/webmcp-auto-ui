// @ts-nocheck
import { agChart, toRows, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const rows = toRows(data);
  if (!rows.length) return renderEmpty(container, 'agcharts-cone-funnel');
  const { title, stageKey = 'x', valueKey = 'y' } = data as any;
  return agChart(container, {
    title: title ? { text: title } : undefined,
    data: rows,
    series: [{ type: 'cone-funnel', stageKey, valueKey }],
  });
}
