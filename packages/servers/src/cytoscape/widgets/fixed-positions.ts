// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cytoscape = (await import('cytoscape')).default;
  container.style.height = container.style.height || "100%";
  container.style.minHeight = container.style.minHeight || "400px";
  const cy = cytoscape({
    container,
    elements: data.elements as any[],
    layout: { name: 'preset', ...data.layout as any },
    style: data.style as any[] || [
      { selector: 'node', style: { 'background-color': '#8b5cf6', 'label': 'data(label)', 'color': '#fff', 'text-valign': 'center', 'font-size': '10px', 'text-outline-color': '#1f2937', 'text-outline-width': 2 } },
      { selector: 'edge', style: { 'width': 2, 'line-color': '#ccc', 'target-arrow-color': '#ccc', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
    ],
  });
  const ro = new ResizeObserver(() => { cy.resize(); cy.fit(); });
  ro.observe(container);
  return () => { ro.disconnect(); cy.destroy(); };
}
