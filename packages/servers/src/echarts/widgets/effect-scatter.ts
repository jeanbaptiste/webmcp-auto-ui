// @ts-nocheck
import { echarts, baseAxis, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { points = [], title, xLabel, yLabel, symbolSize = 15 } = data as any;

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'item' },
    grid: { left: 50, right: 20, top: title ? 60 : 40, bottom: 40, containLabel: true },
    xAxis: { type: 'value', name: xLabel, scale: true, ...baseAxis() },
    yAxis: { type: 'value', name: yLabel, scale: true, ...baseAxis() },
    series: [
      {
        type: 'effectScatter',
        rippleEffect: { brushType: 'stroke', scale: 3 },
        symbolSize,
        data: points,
      },
    ],
  };

  return echarts(container, option);
}
