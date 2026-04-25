// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-force');

  const linkDistance = (data as any).linkDistance ?? 80;
  const nodeStrength = (data as any).nodeStrength ?? -50;

  return makeGraph(container, {
    data: { nodes, edges },
    layout: { type: 'force', linkDistance, nodeStrength, preventOverlap: true },
    node: { style: { labelText: (d: any) => d.data?.label ?? d.id } },
  }, 'g6-force');
}
