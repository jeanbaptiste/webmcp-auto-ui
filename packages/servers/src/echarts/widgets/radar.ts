// @ts-nocheck
import { echarts, baseLegend, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { indicators = [], series = [], title } = data as any;
  // indicators: [{name, max}]
  // series: [{name, value:[...]}]

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'item' },
    legend: { ...baseLegend(), top: title ? 28 : 4 },
    radar: {
      indicator: indicators,
      axisName: { color: '#666' },
      splitLine: { lineStyle: { color: '#ccc' } },
      splitArea: { areaStyle: { color: ['rgba(200,200,200,0.05)', 'rgba(200,200,200,0.1)'] } },
      axisLine: { lineStyle: { color: '#ccc' } },
    },
    series: [
      {
        type: 'radar',
        data: series,
        areaStyle: { opacity: 0.25 },
      },
    ],
  };

  return echarts(container, option);
}
