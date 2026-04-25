// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

/**
 * MDS (Multi-Dimensional Scaling) layout: places nodes so that pairwise
 * Euclidean distances approximate graph-theoretic distances.
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-mds');

  return makeGraph(container, {
    data: { nodes, edges },
    layout: {
      type: 'mds',
      linkDistance: (data as any).linkDistance ?? 100,
    },
    node: { style: { labelText: (d: any) => d.data?.label ?? d.id } },
  }, 'g6-mds');
}
