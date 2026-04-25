// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

/**
 * Snake (boustrophedon) layout: nodes in a serpentine grid — useful for
 * timelines or sequences where left-right order matters but the chain is too
 * long for a single row.
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-snake');

  const cols = (data as any).cols ?? Math.ceil(Math.sqrt(nodes.length));
  const dx = (data as any).dx ?? 80;
  const dy = (data as any).dy ?? 80;

  const positioned = nodes.map((n: any, i: number) => {
    const row = Math.floor(i / cols);
    const colInRow = i % cols;
    const x = (row % 2 === 0 ? colInRow : cols - 1 - colInRow) * dx;
    return { ...n, x, y: row * dy };
  });

  return makeGraph(container, {
    data: { nodes: positioned, edges },
    layout: undefined,
    autoFit: 'view',
    node: {
      style: {
        labelText: (d: any) => d.data?.label ?? d.id,
        labelPlacement: 'bottom',
      },
    },
    edge: { type: 'polyline', style: { router: { type: 'orth' } } },
  }, 'g6-snake');
}
