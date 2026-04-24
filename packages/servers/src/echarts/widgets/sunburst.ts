// @ts-nocheck
import { echarts, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes = [], title } = data as any;

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'sunburst',
        data: nodes,
        radius: [0, '90%'],
        center: ['50%', '55%'],
        label: { color: '#fff', rotate: 'radial' },
        itemStyle: { borderColor: '#fff', borderWidth: 1 },
        emphasis: { focus: 'ancestor' },
      },
    ],
  };

  return echarts(container, option);
}
