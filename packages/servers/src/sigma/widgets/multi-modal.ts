// @ts-nocheck
import { buildGraph, mountSigma, renderEmpty, loadForceAtlas2, colorFor } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const nodes = (data as any)?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return renderEmpty(container, 'sigma-multi-modal');
  }
  const graph = await buildGraph(data);

  // Color nodes by `type` attribute.
  const typeIndex = new Map<string, number>();
  graph.forEachNode((id: string, attrs: any) => {
    const t = attrs.type !== undefined ? String(attrs.type) : '_default';
    if (!typeIndex.has(t)) typeIndex.set(t, typeIndex.size);
  });
  graph.forEachNode((id: string, attrs: any) => {
    const t = attrs.type !== undefined ? String(attrs.type) : '_default';
    const idx = typeIndex.get(t) ?? 0;
    if (!attrs.color || attrs.color === '#4a90e2') {
      graph.setNodeAttribute(id, 'color', colorFor(idx));
    }
  });

  const fa2 = await loadForceAtlas2();
  fa2.assign(graph, { iterations: 100, settings: fa2.inferSettings(graph) });
  return mountSigma(container, graph);
}
