// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

/**
 * Arc diagram: nodes lined up on a horizontal axis, edges drawn as semicircular arcs.
 * G6 v5 has no built-in arc layout, so we lay nodes on y=0 and use quadratic edges.
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-arc-diagram');

  const spacing = (data as any).spacing ?? 50;
  const positioned = nodes.map((n: any, i: number) => ({
    ...n,
    x: i * spacing,
    y: 0,
  }));

  return makeGraph(container, {
    data: { nodes: positioned, edges },
    layout: undefined,
    autoFit: 'view',
    node: {
      style: {
        size: 14,
        labelText: (d: any) => d.data?.label ?? d.id,
        labelPlacement: 'bottom',
        labelOffsetY: 8,
      },
    },
    edge: {
      type: 'quadratic',
      style: {
        curveOffset: -40,
        curvePosition: 0.5,
        endArrow: false,
      },
    },
    behaviors: ['drag-canvas', 'zoom-canvas'],
  }, 'g6-arc-diagram');
}
