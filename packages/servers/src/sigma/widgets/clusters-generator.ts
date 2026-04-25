// @ts-nocheck
import { mountSigma, loadGenerators, loadForceAtlas2, colorFor } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const order = (data as any)?.order ?? 80;
  const size = (data as any)?.size ?? 200;
  const clusters = (data as any)?.clusters ?? 4;
  const clusterDensity = (data as any)?.clusterDensity ?? 0.7;

  const generators = await loadGenerators();
  const graph = generators.random.clusters(undefined, {
    order,
    size,
    clusters,
    clusterDensity,
  });

  // generators.random.clusters annotates nodes with a `cluster` attribute.
  graph.forEachNode((id: string, attrs: any) => {
    const idx = typeof attrs.cluster === 'number' ? attrs.cluster : 0;
    graph.mergeNodeAttributes(id, {
      label: id,
      x: Math.random(),
      y: Math.random(),
      size: 5,
      color: colorFor(idx),
    });
  });

  const fa2 = await loadForceAtlas2();
  fa2.assign(graph, { iterations: 150, settings: fa2.inferSettings(graph) });
  return mountSigma(container, graph);
}
