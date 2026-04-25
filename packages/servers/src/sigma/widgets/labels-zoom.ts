// @ts-nocheck
import { buildGraph, mountSigma, renderEmpty, loadForceAtlas2 } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const nodes = (data as any)?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return renderEmpty(container, 'sigma-labels-zoom');
  }
  const labelDensity = (data as any)?.labelDensity ?? 0.07;
  const labelGridCellSize = (data as any)?.labelGridCellSize ?? 60;
  const labelRenderedSizeThreshold = (data as any)?.labelRenderedSizeThreshold ?? 6;
  const graph = await buildGraph(data);
  const fa2 = await loadForceAtlas2();
  fa2.assign(graph, { iterations: 100, settings: fa2.inferSettings(graph) });
  return mountSigma(container, graph, {
    labelDensity,
    labelGridCellSize,
    labelRenderedSizeThreshold,
  });
}
