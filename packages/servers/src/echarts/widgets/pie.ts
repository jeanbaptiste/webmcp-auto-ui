// @ts-nocheck
import { echarts, baseLegend, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { values = [], title, donut = false, roseType } = data as any;

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { ...baseLegend(), orient: 'vertical', left: 'left' },
    series: [
      {
        type: 'pie',
        radius: donut ? ['40%', '70%'] : '65%',
        center: ['60%', '50%'],
        roseType: roseType || undefined,
        data: values,
        label: { color: '#666' },
        labelLine: { lineStyle: { color: '#ccc' } },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' },
        },
      },
    ],
  };

  return echarts(container, option);
}
