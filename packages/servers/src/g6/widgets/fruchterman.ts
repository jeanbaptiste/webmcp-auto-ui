// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-fruchterman');

  return makeGraph(container, {
    data: { nodes, edges },
    layout: {
      type: 'fruchterman',
      gravity: (data as any).gravity ?? 10,
      speed: (data as any).speed ?? 5,
      maxIteration: (data as any).maxIteration ?? 1000,
      clustering: (data as any).clustering ?? false,
    },
    node: { style: { labelText: (d: any) => d.data?.label ?? d.id } },
  }, 'g6-fruchterman');
}
