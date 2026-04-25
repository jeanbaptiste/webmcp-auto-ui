// @ts-nocheck
import { buildGraph, mountSigma, renderEmpty, loadForceAtlas2, colorFor } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const nodes = (data as any)?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return renderEmpty(container, 'sigma-clusters');
  }
  const graph = await buildGraph(data);

  // Map clusters → colors. Accepts string or number cluster ids.
  const clusterIndex = new Map<string, number>();
  graph.forEachNode((id: string, attrs: any) => {
    const key = attrs.cluster !== undefined ? String(attrs.cluster) : '_default';
    if (!clusterIndex.has(key)) clusterIndex.set(key, clusterIndex.size);
  });
  graph.forEachNode((id: string, attrs: any) => {
    const key = attrs.cluster !== undefined ? String(attrs.cluster) : '_default';
    const idx = clusterIndex.get(key) ?? 0;
    graph.setNodeAttribute(id, 'color', colorFor(idx));
  });

  const fa2 = await loadForceAtlas2();
  fa2.assign(graph, { iterations: 100, settings: fa2.inferSettings(graph) });
  return mountSigma(container, graph);
}
