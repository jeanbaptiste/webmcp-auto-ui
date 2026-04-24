// @ts-nocheck
import { echarts, baseLegend, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { values = [], title } = data as any;
  // values: [[date, value, category], ...]

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: '#ccc' } } },
    legend: baseLegend(),
    singleAxis: {
      top: title ? 60 : 40,
      bottom: 40,
      axisTick: { lineStyle: { color: '#ccc' } },
      axisLabel: { color: '#666' },
      type: 'time',
      axisPointer: { animation: true, label: { show: true } },
      splitLine: { show: true, lineStyle: { type: 'dashed', color: '#ccc' } },
    },
    series: [
      {
        type: 'themeRiver',
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
        data: values,
        label: { color: '#666' },
      },
    ],
  };

  return echarts(container, option);
}
