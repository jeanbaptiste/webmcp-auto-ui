// @ts-nocheck
import { buildGraph, mountSigma, renderEmpty, loadForceAtlas2 } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const nodes = (data as any)?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return renderEmpty(container, 'sigma-edge-weights');
  }
  const minSize = (data as any)?.minSize ?? 0.5;
  const maxSize = (data as any)?.maxSize ?? 8;
  const graph = await buildGraph(data);

  // Map weight → edge size.
  let maxW = 0;
  graph.forEachEdge((id: string, attrs: any) => {
    const w = typeof attrs.weight === 'number' ? attrs.weight : 1;
    if (w > maxW) maxW = w;
  });
  if (maxW === 0) maxW = 1;
  graph.forEachEdge((id: string, attrs: any) => {
    const w = typeof attrs.weight === 'number' ? attrs.weight : 1;
    const size = minSize + (maxSize - minSize) * (w / maxW);
    graph.setEdgeAttribute(id, 'size', size);
  });

  const fa2 = await loadForceAtlas2();
  fa2.assign(graph, { iterations: 100, settings: fa2.inferSettings(graph) });
  return mountSigma(container, graph);
}
