// @ts-nocheck
import { buildGraph, renderEmpty, loadForceAtlas2, loadSigma, sigmaSettings, prepareContainer } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const nodes = (data as any)?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return renderEmpty(container, 'sigma-hover-highlight');
  }
  const graph = await buildGraph(data);
  const fa2 = await loadForceAtlas2();
  fa2.assign(graph, { iterations: 100, settings: fa2.inferSettings(graph) });

  const Sigma = await loadSigma();
  prepareContainer(container);

  // Reducer-driven hover highlight: dim non-neighbors of hovered node.
  let hoveredNode: string | null = null;
  let hoveredNeighbors: Set<string> = new Set();

  const renderer = new Sigma(graph, container, {
    ...sigmaSettings(),
    nodeReducer: (node: string, attrs: any) => {
      const res: any = { ...attrs };
      if (hoveredNode && node !== hoveredNode && !hoveredNeighbors.has(node)) {
        res.color = '#e0e0e0';
        res.label = '';
      } else if (hoveredNode === node) {
        res.highlighted = true;
      }
      return res;
    },
    edgeReducer: (edge: string, attrs: any) => {
      const res: any = { ...attrs };
      if (hoveredNode) {
        const [s, t] = graph.extremities(edge);
        if (s !== hoveredNode && t !== hoveredNode) {
          res.hidden = true;
        }
      }
      return res;
    },
  });

  renderer.on('enterNode', ({ node }: any) => {
    hoveredNode = node;
    hoveredNeighbors = new Set(graph.neighbors(node));
    renderer.refresh();
  });
  renderer.on('leaveNode', () => {
    hoveredNode = null;
    hoveredNeighbors = new Set();
    renderer.refresh();
  });

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const ro = new ResizeObserver(() => {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      try { renderer.refresh(); } catch { /* ignore */ }
    }, 50);
  });
  ro.observe(container);

  return () => {
    ro.disconnect();
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    try { renderer.kill(); } catch { /* ignore */ }
    container.innerHTML = '';
  };
}
