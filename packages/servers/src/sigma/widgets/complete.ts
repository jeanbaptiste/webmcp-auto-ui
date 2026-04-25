// @ts-nocheck
import { mountSigma, loadGenerators, loadCircular, colorFor } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const order = (data as any)?.order ?? 8;

  const generators = await loadGenerators();
  const graph = generators.classic.complete(undefined, order);

  graph.forEachNode((id: string) => {
    graph.mergeNodeAttributes(id, {
      label: id,
      x: Math.random(),
      y: Math.random(),
      size: 6,
      color: colorFor(2),
    });
  });

  const circular = await loadCircular();
  circular.assign(graph);
  return mountSigma(container, graph);
}
