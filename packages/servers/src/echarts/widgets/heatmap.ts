// @ts-nocheck
import { echarts, baseAxis, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { xCategories = [], yCategories = [], values = [], title, min, max } = data as any;
  // values: [[xIdx, yIdx, value], ...]

  const nums = values.map((v: any[]) => v[2]).filter((n: number) => Number.isFinite(n));
  const computedMin = min ?? (nums.length ? Math.min(...nums) : 0);
  const computedMax = max ?? (nums.length ? Math.max(...nums) : 1);

  const option = {
    title: baseTitle(title),
    tooltip: { position: 'top' },
    grid: { left: 60, right: 20, top: title ? 60 : 40, bottom: 60, containLabel: true },
    xAxis: { type: 'category', data: xCategories, splitArea: { show: true }, ...baseAxis() },
    yAxis: { type: 'category', data: yCategories, splitArea: { show: true }, ...baseAxis() },
    visualMap: {
      min: computedMin,
      max: computedMax,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 5,
      textStyle: { color: '#666' },
      inRange: { color: ['#e0f3f8', '#91bfdb', '#4575b4'] },
    },
    series: [
      {
        name: 'Heatmap',
        type: 'heatmap',
        data: values,
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
      },
    ],
  };

  return echarts(container, option);
}
