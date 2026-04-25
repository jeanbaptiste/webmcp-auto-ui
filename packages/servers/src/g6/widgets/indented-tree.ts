// @ts-nocheck
import { makeGraph, normalizeGraph, flattenTree, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const tree = (data as any).root ?? (data as any).tree;
  const graph = tree ? flattenTree(tree) : normalizeGraph(data);
  if (!graph.nodes.length) return renderEmpty(container, 'g6-indented-tree');

  return makeGraph(container, {
    data: { nodes: graph.nodes, edges: graph.edges },
    layout: {
      type: 'indented',
      direction: (data as any).direction ?? 'LR',
      indent: (data as any).indent ?? 30,
      rowSep: (data as any).rowSep ?? 24,
    },
    node: {
      type: 'rect',
      style: {
        labelText: (d: any) => d.data?.label ?? d.id,
        labelPlacement: 'right',
        labelOffsetX: 8,
        size: [10, 10],
        fill: '#3388ff',
      },
    },
    edge: { type: 'polyline', style: { router: { type: 'orth' } } },
  }, 'g6-indented-tree');
}
