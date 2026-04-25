// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-flow');

  return makeGraph(container, {
    data: { nodes, edges },
    layout: {
      type: 'antv-dagre',
      rankdir: (data as any).rankdir ?? 'LR',
      nodesep: (data as any).nodesep ?? 30,
      ranksep: (data as any).ranksep ?? 80,
    },
    node: {
      type: 'rect',
      style: {
        labelText: (d: any) => d.data?.label ?? d.id,
        labelPlacement: 'center',
        size: [110, 36],
        fill: '#fff',
        stroke: '#3388ff',
        lineWidth: 1.5,
        radius: 6,
      },
    },
    edge: { type: 'polyline', style: { router: { type: 'orth' }, endArrow: true } },
  }, 'g6-flow');
}
