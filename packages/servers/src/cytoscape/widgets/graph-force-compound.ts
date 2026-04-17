// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cytoscape = (await import('cytoscape')).default;
  // Use cose-bilkent for better compound node handling
  try {
    const coseBilkent = (await import('cytoscape-cose-bilkent')).default;
    cytoscape.use(coseBilkent);
  } catch { /* fallback to cose */ }
  container.style.height = container.style.height || '400px';
  const layoutName = typeof cytoscape('headless', {}).layout === 'function' ? 'cose-bilkent' : 'cose';
  const cy = cytoscape({
    container,
    elements: data.elements as any[],
    layout: { name: 'cose-bilkent', animate: 'end', ...data.layout as any },
    style: data.style as any[] || [
      { selector: 'node', style: { 'background-color': '#8b5cf6', 'label': 'data(label)', 'color': '#fff', 'text-valign': 'center', 'font-size': '10px', 'text-outline-color': '#1f2937', 'text-outline-width': 2 } },
      { selector: ':parent', style: { 'background-opacity': 0.1, 'background-color': '#6366f1', 'border-width': 2, 'border-color': '#6366f1' } },
      { selector: 'edge', style: { 'width': 2, 'line-color': '#ccc', 'target-arrow-color': '#ccc', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
    ],
  });
  const ro = new ResizeObserver(() => { cy.resize(); cy.fit(); });
  ro.observe(container);
  return () => { ro.disconnect(); cy.destroy(); };
}
