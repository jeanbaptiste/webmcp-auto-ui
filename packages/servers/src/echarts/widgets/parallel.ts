// @ts-nocheck
import { echarts, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { dimensions = [], values = [], title } = data as any;
  // dimensions: [{name, type?}], values: [[...], ...]

  const option = {
    title: baseTitle(title),
    parallelAxis: dimensions.map((d: any, i: number) => ({
      dim: i,
      name: d.name,
      type: d.type ?? 'value',
      nameTextStyle: { color: '#666' },
      axisLabel: { color: '#666' },
      axisLine: { lineStyle: { color: '#ccc' } },
    })),
    parallel: {
      top: title ? 60 : 40,
      left: 50,
      right: 60,
      bottom: 40,
      parallelAxisDefault: { axisLine: { lineStyle: { color: '#ccc' } } },
    },
    series: [
      {
        type: 'parallel',
        lineStyle: { width: 1, opacity: 0.4 },
        data: values,
      },
    ],
  };

  return echarts(container, option);
}
