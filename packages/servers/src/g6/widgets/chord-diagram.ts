// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

/**
 * Chord diagram approximation: circular layout with curved internal edges.
 * Edges are drawn as quadratic curves with a strong curveOffset toward the center.
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-chord-diagram');

  return makeGraph(container, {
    data: { nodes, edges },
    layout: { type: 'circular', radius: (data as any).radius ?? 200 },
    node: {
      style: {
        size: 16,
        labelText: (d: any) => d.data?.label ?? d.id,
        labelPlacement: 'right',
      },
    },
    edge: {
      type: 'quadratic',
      style: {
        curveOffset: (data as any).curveOffset ?? 40,
        stroke: '#999',
        strokeOpacity: 0.6,
        endArrow: false,
      },
    },
  }, 'g6-chord-diagram');
}
