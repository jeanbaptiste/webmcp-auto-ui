// @ts-nocheck
import { echarts, baseAxis, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { categories = [], boxData = [], title, yLabel } = data as any;
  // boxData: [[min, Q1, median, Q3, max], ...] one entry per category

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'item' },
    grid: { left: 60, right: 20, top: title ? 60 : 40, bottom: 40, containLabel: true },
    xAxis: { type: 'category', data: categories, ...baseAxis() },
    yAxis: { type: 'value', name: yLabel, ...baseAxis() },
    series: [
      {
        type: 'boxplot',
        data: boxData,
      },
    ],
  };

  return echarts(container, option);
}
