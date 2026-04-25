// @ts-nocheck
import { buildGraph, mountSigma, renderEmpty, loadForceAtlas2 } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const nodes = (data as any)?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return renderEmpty(container, 'sigma-degree-sized');
  }
  const minSize = (data as any)?.minSize ?? 3;
  const maxSize = (data as any)?.maxSize ?? 20;
  const graph = await buildGraph(data);

  // Compute degree-based sizing.
  let maxDeg = 0;
  graph.forEachNode((id: string) => {
    maxDeg = Math.max(maxDeg, graph.degree(id));
  });
  if (maxDeg === 0) maxDeg = 1;
  graph.forEachNode((id: string) => {
    const d = graph.degree(id);
    const size = minSize + (maxSize - minSize) * (d / maxDeg);
    graph.setNodeAttribute(id, 'size', size);
  });

  const fa2 = await loadForceAtlas2();
  fa2.assign(graph, { iterations: 100, settings: fa2.inferSettings(graph) });
  return mountSigma(container, graph);
}
