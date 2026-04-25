// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-dagre');

  return makeGraph(container, {
    data: { nodes, edges },
    layout: {
      type: 'dagre',
      rankdir: (data as any).rankdir ?? 'TB',
      align: (data as any).align,
      nodesep: (data as any).nodesep ?? 30,
      ranksep: (data as any).ranksep ?? 60,
    },
    node: { style: { labelText: (d: any) => d.data?.label ?? d.id } },
  }, 'g6-dagre');
}
