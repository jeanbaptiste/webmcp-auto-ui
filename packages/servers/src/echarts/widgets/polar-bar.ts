// @ts-nocheck
import { echarts, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { categories = [], values = [], title } = data as any;

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'axis' },
    angleAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: '#666' },
      axisLine: { lineStyle: { color: '#ccc' } },
    },
    radiusAxis: {
      axisLabel: { color: '#666' },
      axisLine: { lineStyle: { color: '#ccc' } },
      splitLine: { lineStyle: { color: '#ccc', type: 'dashed' } },
    },
    polar: { center: ['50%', '55%'] },
    series: [
      { type: 'bar', data: values, coordinateSystem: 'polar' },
    ],
  };

  return echarts(container, option);
}
