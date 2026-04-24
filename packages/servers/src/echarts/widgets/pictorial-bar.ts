// @ts-nocheck
import { echarts, baseAxis, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { categories = [], values = [], title, symbol = 'circle', xLabel, yLabel } = data as any;

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: title ? 60 : 40, bottom: 40, containLabel: true },
    xAxis: { type: 'category', data: categories, name: xLabel, ...baseAxis() },
    yAxis: { type: 'value', name: yLabel, ...baseAxis() },
    series: [
      {
        type: 'pictorialBar',
        data: values,
        symbol,
        symbolRepeat: true,
        symbolSize: ['80%', 14],
        symbolMargin: 2,
        symbolClip: true,
      },
    ],
  };

  return echarts(container, option);
}
