// @ts-nocheck
import { echarts, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { value = 0, min = 0, max = 100, name = '', title, unit = '' } = data as any;

  const option = {
    title: baseTitle(title),
    series: [
      {
        type: 'gauge',
        min,
        max,
        center: ['50%', '60%'],
        progress: { show: true, width: 18 },
        axisLine: { lineStyle: { width: 18 } },
        axisTick: { show: false },
        splitLine: { length: 15, lineStyle: { color: '#ccc' } },
        axisLabel: { color: '#666', distance: 25, fontSize: 10 },
        pointer: { length: '60%', width: 6 },
        anchor: { show: true, showAbove: true, size: 12, itemStyle: { color: '#999' } },
        detail: {
          valueAnimation: true,
          formatter: `{value}${unit}`,
          color: '#666',
          fontSize: 22,
          offsetCenter: [0, '70%'],
        },
        data: [{ value, name }],
        title: { color: '#666', fontSize: 12, offsetCenter: [0, '92%'] },
      },
    ],
  };

  return echarts(container, option);
}
