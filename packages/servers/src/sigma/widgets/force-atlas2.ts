// @ts-nocheck
import { buildGraph, mountSigma, renderEmpty, loadForceAtlas2 } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const nodes = (data as any)?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return renderEmpty(container, 'sigma-force-atlas2');
  }
  const iterations = (data as any)?.iterations ?? 100;
  const graph = await buildGraph(data);
  const fa2 = await loadForceAtlas2();
  fa2.assign(graph, { iterations, settings: fa2.inferSettings(graph) });
  return mountSigma(container, graph);
}
