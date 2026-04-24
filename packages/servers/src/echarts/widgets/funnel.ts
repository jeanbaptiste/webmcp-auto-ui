// @ts-nocheck
import { echarts, baseLegend, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { values = [], title, sort = 'descending' } = data as any;

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    legend: { ...baseLegend(), top: title ? 28 : 4 },
    series: [
      {
        type: 'funnel',
        top: title ? 70 : 50,
        bottom: 20,
        left: '10%',
        right: '10%',
        sort,
        gap: 2,
        label: { show: true, position: 'inside', color: '#fff' },
        labelLine: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 1 },
        emphasis: { label: { fontSize: 14 } },
        data: values,
      },
    ],
  };

  return echarts(container, option);
}
