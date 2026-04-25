// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-force-atlas2');

  return makeGraph(container, {
    data: { nodes, edges },
    layout: {
      type: 'force-atlas2',
      kr: (data as any).kr ?? 5,
      kg: (data as any).kg ?? 1,
      mode: (data as any).mode ?? 'normal',
      preventOverlap: true,
      barnesHut: (data as any).barnesHut ?? false,
    },
    node: { style: { labelText: (d: any) => d.data?.label ?? d.id } },
  }, 'g6-force-atlas2');
}
