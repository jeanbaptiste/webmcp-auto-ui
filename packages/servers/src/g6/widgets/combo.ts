// @ts-nocheck
import { makeGraph, normalizeGraph, renderEmpty } from './shared.js';

/**
 * Combo (compound) graph: nodes can belong to a parent "combo" group.
 * Pass `combos: [{id, label?}]` and add `combo: <comboId>` on each node.
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, edges } = normalizeGraph(data);
  if (!nodes.length) return renderEmpty(container, 'g6-combo');

  // Carry combo membership through node.data
  const rawNodes = (data as any).nodes ?? [];
  const nodesWithCombo = nodes.map((n: any, i: number) => {
    const raw = rawNodes[i] ?? {};
    return { ...n, combo: raw.combo != null ? String(raw.combo) : undefined };
  });

  const combos = ((data as any).combos ?? []).map((c: any, i: number) => ({
    id: c.id != null ? String(c.id) : `c${i}`,
    data: { label: c.label ?? c.id },
  }));

  return makeGraph(container, {
    data: { nodes: nodesWithCombo, edges, combos },
    layout: {
      type: 'combo-combined',
      preventOverlap: true,
      spacing: (data as any).spacing ?? 20,
    },
    node: { style: { labelText: (d: any) => d.data?.label ?? d.id } },
    combo: {
      type: 'rect',
      style: {
        labelText: (d: any) => d.data?.label ?? d.id,
        labelPlacement: 'top',
        fill: '#f0f6ff',
        stroke: '#3388ff',
        lineDash: [4, 4],
        radius: 6,
      },
    },
  }, 'g6-combo');
}
