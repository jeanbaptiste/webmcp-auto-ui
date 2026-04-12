// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cytoscape = (await import('cytoscape')).default;
  container.style.height = container.style.height || '400px';
  const cy = cytoscape({
    container,
    elements: data.elements as any[],
    layout: { name: 'cose', animate: true, ...data.layout as any },
    style: data.style as any[] || [
      { selector: 'node', style: { 'background-color': '#8b5cf6', 'label': 'data(label)', 'color': '#fff', 'text-valign': 'center', 'font-size': '10px' } },
      { selector: 'edge', style: { 'width': (el: any) => 2 + (el.data('flow') ?? 0) * 0.5, 'line-color': '#6366f1', 'target-arrow-color': '#6366f1', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'line-style': 'dashed', 'line-dash-pattern': [6, 3] } },
    ],
  });

  // Animate dashes (marching ants effect)
  let offset = 0;
  const interval = setInterval(() => {
    offset = (offset + 1) % 9;
    cy.edges().style({ 'line-dash-offset': -offset });
  }, 100);

  return () => {
    clearInterval(interval);
    cy.destroy();
  };
}
