// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-concentric');

  return makeGraph(container, {
    data: { nodes, edges },
    layout: {
      type: 'concentric',
      minNodeSpacing: (data as any).minNodeSpacing ?? 30,
      preventOverlap: true,
      sortBy: (data as any).sortBy ?? 'degree',
      equidistant: (data as any).equidistant ?? false,
    },
    node: { style: { labelText: (d: any) => d.data?.label ?? d.id } },
  }, 'g6-concentric');
}
