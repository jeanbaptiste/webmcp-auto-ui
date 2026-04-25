// @ts-nocheck
import { buildGraph, mountSigma, renderEmpty, loadRandom } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const nodes = (data as any)?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return renderEmpty(container, 'sigma-random');
  }
  const graph = await buildGraph(data);
  const random = await loadRandom();
  random.assign(graph);
  return mountSigma(container, graph);
}
