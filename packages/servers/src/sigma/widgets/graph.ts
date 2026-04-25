// @ts-nocheck
import { buildGraph, mountSigma, renderEmpty, loadForceAtlas2 } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const nodes = (data as any)?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return renderEmpty(container, 'sigma-graph');
  }
  const graph = await buildGraph(data);
  // Sensible default: a quick force atlas pass to give untyped graphs a layout.
  const fa2 = await loadForceAtlas2();
  try {
    fa2.assign(graph, { iterations: 50, settings: fa2.inferSettings(graph) });
  } catch {
    // ignore — graph may already have positions
  }
  return mountSigma(container, graph);
}
