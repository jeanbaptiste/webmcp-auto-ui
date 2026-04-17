// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cytoscape = (await import('cytoscape')).default;
  container.style.height = container.style.height || '400px';
  const cy = cytoscape({
    container,
    elements: data.elements as any[],
    layout: { name: 'cose', animate: true, ...data.layout as any },
    style: data.style as any[] || [
      { selector: 'node', style: { 'background-color': '#8b5cf6', 'label': 'data(label)', 'color': '#fff', 'text-valign': 'center', 'font-size': '10px', 'text-outline-color': '#1f2937', 'text-outline-width': 2 } },
      { selector: 'edge', style: { 'width': 2, 'line-color': '#ccc', 'target-arrow-color': '#ccc', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
    ],
  });

  // Compute PageRank and scale node sizes
  const pr = cy.elements().pageRank({});
  cy.nodes().forEach((node: any) => {
    const rank = pr.rank(node);
    const size = 20 + rank * 200;
    node.style({ width: size, height: size });
  });

  const ro = new ResizeObserver(() => { cy.resize(); cy.fit(); });
  ro.observe(container);
  return () => { ro.disconnect(); cy.destroy(); };
}
