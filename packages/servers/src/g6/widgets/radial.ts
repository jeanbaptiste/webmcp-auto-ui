// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-radial');

  return makeGraph(container, {
    data: { nodes, edges },
    layout: {
      type: 'radial',
      unitRadius: (data as any).unitRadius ?? 80,
      focusNode: (data as any).focusNode,
      preventOverlap: true,
      nodeSize: (data as any).nodeSize ?? 30,
    },
    node: { style: { labelText: (d: any) => d.data?.label ?? d.id } },
  }, 'g6-radial');
}
