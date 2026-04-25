// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

/**
 * Ego network: a focal node plus its 1-hop (or k-hop) neighbors.
 * Filters input graph to keep only nodes within `depth` hops of `focus`.
 * Uses radial layout centered on the focus node.
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-ego-network');

  const focus = String((data as any).focus ?? nodes[0].id);
  const depth = (data as any).depth ?? 1;

  // BFS to depth
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }
  const keep = new Set<string>([focus]);
  let frontier = [focus];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const nb of adj.get(id) ?? []) {
        if (!keep.has(nb)) {
          keep.add(nb);
          next.push(nb);
        }
      }
    }
    frontier = next;
  }
  const fNodes = nodes.filter((n: any) => keep.has(n.id));
  const fEdges = edges.filter((e: any) => keep.has(e.source) && keep.has(e.target));

  return makeGraph(container, {
    data: { nodes: fNodes, edges: fEdges },
    layout: {
      type: 'radial',
      focusNode: focus,
      unitRadius: (data as any).unitRadius ?? 100,
      preventOverlap: true,
      nodeSize: 30,
    },
    node: {
      style: {
        labelText: (d: any) => d.data?.label ?? d.id,
        fill: (d: any) => (d.id === focus ? '#ff6b35' : '#3388ff'),
        size: (d: any) => (d.id === focus ? 30 : 18),
      },
    },
  }, 'g6-ego-network');
}
