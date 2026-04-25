// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-circular');

  return makeGraph(container, {
    data: { nodes, edges },
    layout: {
      type: 'circular',
      radius: (data as any).radius,
      angleRatio: (data as any).angleRatio ?? 1,
      ordering: (data as any).ordering ?? null,
    },
    node: { style: { labelText: (d: any) => d.data?.label ?? d.id } },
  }, 'g6-circular');
}
