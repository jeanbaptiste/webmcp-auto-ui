// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-grid');

  return makeGraph(container, {
    data: { nodes, edges },
    layout: {
      type: 'grid',
      rows: (data as any).rows,
      cols: (data as any).cols,
      sortBy: (data as any).sortBy,
    },
    node: { style: { labelText: (d: any) => d.data?.label ?? d.id } },
  }, 'g6-grid');
}
