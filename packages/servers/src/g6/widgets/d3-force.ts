// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-d3-force');

  return makeGraph(container, {
    data: { nodes, edges },
    layout: {
      type: 'd3-force',
      link: { distance: (data as any).linkDistance ?? 80 },
      manyBody: { strength: (data as any).manyBodyStrength ?? -80 },
      collide: { radius: (data as any).collideRadius ?? 20 },
    },
    node: { style: { labelText: (d: any) => d.data?.label ?? d.id } },
  }, 'g6-d3-force');
}
