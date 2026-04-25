// @ts-nocheck
import { mountSigma, loadGenerators, loadForceAtlas2, colorFor } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const order = (data as any)?.order ?? 50;
  const probability = (data as any)?.probability ?? 0.05;

  const generators = await loadGenerators();
  const graph = generators.random.erdosRenyi(undefined, { order, probability });

  // Assign default visual attrs and starting positions.
  graph.forEachNode((id: string) => {
    graph.mergeNodeAttributes(id, {
      label: id,
      x: Math.random(),
      y: Math.random(),
      size: 5,
      color: colorFor(0),
    });
  });

  const fa2 = await loadForceAtlas2();
  fa2.assign(graph, { iterations: 100, settings: fa2.inferSettings(graph) });
  return mountSigma(container, graph);
}
