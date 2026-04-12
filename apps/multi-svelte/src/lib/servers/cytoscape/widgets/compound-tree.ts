// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cytoscape = (await import('cytoscape')).default;
  try {
    const coseBilkent = (await import('cytoscape-cose-bilkent')).default;
    cytoscape.use(coseBilkent);
  } catch { /* fallback to cose */ }
  container.style.height = container.style.height || '400px';
  const cy = cytoscape({
    container,
    elements: data.elements as any[],
    layout: { name: 'cose-bilkent', animate: 'end', idealEdgeLength: 100, ...data.layout as any },
    style: data.style as any[] || [
      { selector: 'node', style: { 'background-color': '#8b5cf6', 'label': 'data(label)', 'color': '#fff', 'text-valign': 'center', 'font-size': '10px' } },
      { selector: ':parent', style: { 'background-opacity': 0.1, 'background-color': '#6366f1', 'border-width': 2, 'border-color': '#6366f1', 'label': 'data(label)', 'text-valign': 'top', 'font-size': '12px', 'color': '#6366f1' } },
      { selector: 'edge', style: { 'width': 2, 'line-color': '#94a3b8', 'target-arrow-color': '#94a3b8', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
    ],
  });
  return () => { cy.destroy(); };
}
