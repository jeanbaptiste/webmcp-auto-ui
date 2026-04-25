// @ts-nocheck
import { makeGraph, normalizeGraph, flattenTree, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  // Accept either a tree-shaped {root: {label, children}} or flat {nodes, edges}
  const tree = (data as any).root ?? (data as any).tree;
  const graph = tree ? flattenTree(tree) : normalizeGraph(data);
  if (!graph.nodes.length) return renderEmpty(container, 'g6-tree');

  return makeGraph(container, {
    data: { nodes: graph.nodes, edges: graph.edges },
    layout: {
      type: 'dendrogram',
      direction: (data as any).direction ?? 'TB',
      nodeSep: (data as any).nodeSep ?? 30,
      rankSep: (data as any).rankSep ?? 80,
    },
    node: { style: { labelText: (d: any) => d.data?.label ?? d.id } },
    edge: { type: 'polyline' },
  }, 'g6-tree');
}
