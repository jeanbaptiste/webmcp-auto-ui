// @ts-nocheck
import { echarts, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes = [], links = [], title } = data as any;

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'item', triggerOn: 'mousemove' },
    series: [
      {
        type: 'sankey',
        data: nodes,
        links,
        top: title ? 50 : 10,
        left: 10,
        right: 60,
        bottom: 10,
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', curveness: 0.5 },
        label: { color: '#666' },
      },
    ],
  };

  return echarts(container, option);
}
