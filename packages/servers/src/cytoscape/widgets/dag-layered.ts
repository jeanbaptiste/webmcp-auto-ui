// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cytoscape = (await import('cytoscape')).default;
  try {
    const dagre = (await import('cytoscape-dagre')).default;
    cytoscape.use(dagre);
  } catch { /* fallback to breadthfirst */ }
  container.style.height = container.style.height || '400px';
  const cy = cytoscape({
    container,
    elements: data.elements as any[],
    layout: { name: 'dagre', rankDir: 'TB', ranker: 'network-simplex', rankSep: 100, nodeSep: 40, ...data.layout as any },
    style: data.style as any[] || [
      { selector: 'node', style: { 'background-color': '#6366f1', 'label': 'data(label)', 'color': '#fff', 'text-valign': 'center', 'font-size': '10px', 'text-outline-color': '#1f2937', 'text-outline-width': 2 } },
      { selector: 'edge', style: { 'width': 2, 'line-color': '#a5b4fc', 'target-arrow-color': '#a5b4fc', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
    ],
  });
  const ro = new ResizeObserver(() => { cy.resize(); cy.fit(); });
  ro.observe(container);
  return () => { ro.disconnect(); cy.destroy(); };
}
