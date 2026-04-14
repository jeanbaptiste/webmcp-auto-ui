// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cytoscape = (await import('cytoscape')).default;
  container.style.height = container.style.height || '400px';
  const layoutOpts = data.layout as any || {};
  const cy = cytoscape({
    container,
    elements: data.elements as any[],
    layout: {
      name: 'cose',
      animate: true,
      infinite: true,
      gravity: layoutOpts.gravity ?? 80,
      nodeRepulsion: () => layoutOpts.nodeRepulsion ?? 4500,
      edgeElasticity: () => layoutOpts.edgeElasticity ?? 45,
      ...layoutOpts,
    },
    style: data.style as any[] || [
      { selector: 'node', style: { 'background-color': '#8b5cf6', 'label': 'data(label)', 'color': '#fff', 'text-valign': 'center', 'font-size': '10px' } },
      { selector: 'edge', style: { 'width': 2, 'line-color': '#ccc', 'target-arrow-color': '#ccc', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
    ],
  });
  return () => { cy.destroy(); };
}
