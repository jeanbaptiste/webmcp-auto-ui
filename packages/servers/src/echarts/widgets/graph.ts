// @ts-nocheck
import { echarts, baseLegend, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes = [], links = [], categories, title, layout = 'force' } = data as any;

  const option = {
    title: baseTitle(title),
    tooltip: {},
    legend: categories ? { ...baseLegend(), data: categories.map((c: any) => c.name) } : undefined,
    series: [
      {
        type: 'graph',
        layout,
        data: nodes,
        links,
        categories,
        roam: true,
        draggable: true,
        label: { show: true, position: 'right', color: '#666' },
        force: layout === 'force' ? { repulsion: 100, gravity: 0.1, edgeLength: 80 } : undefined,
        lineStyle: { color: '#ccc', curveness: 0.1 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
      },
    ],
  };

  return echarts(container, option);
}
