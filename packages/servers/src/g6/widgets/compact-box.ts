// @ts-nocheck
import { makeGraph, normalizeGraph, flattenTree, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const tree = (data as any).root ?? (data as any).tree;
  const graph = tree ? flattenTree(tree) : normalizeGraph(data);
  if (!graph.nodes.length) return renderEmpty(container, 'g6-compact-box');

  return makeGraph(container, {
    data: { nodes: graph.nodes, edges: graph.edges },
    layout: {
      type: 'compact-box',
      direction: (data as any).direction ?? 'LR',
      getHGap: () => (data as any).hGap ?? 50,
      getVGap: () => (data as any).vGap ?? 20,
    },
    node: {
      type: 'rect',
      style: {
        labelText: (d: any) => d.data?.label ?? d.id,
        labelPlacement: 'center',
        size: [100, 28],
        fill: '#e6f1ff',
        stroke: '#3388ff',
        radius: 4,
      },
    },
    edge: { type: 'cubic-horizontal' },
  }, 'g6-compact-box');
}
