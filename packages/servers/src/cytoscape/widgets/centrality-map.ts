// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cytoscape = (await import('cytoscape')).default;
  container.style.height = container.style.height || "100%";
  container.style.minHeight = container.style.minHeight || "400px";
  const cy = cytoscape({
    container,
    elements: data.elements as any[],
    layout: { name: 'cose', animate: true, ...data.layout as any },
    style: data.style as any[] || [
      { selector: 'node', style: { 'label': 'data(label)', 'color': '#fff', 'text-valign': 'center', 'font-size': '10px', 'text-outline-color': '#1f2937', 'text-outline-width': 2 } },
      { selector: 'edge', style: { 'width': 2, 'line-color': '#e2e8f0', 'target-arrow-color': '#e2e8f0', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
    ],
  });

  // Compute betweenness centrality and color nodes
  const bc = cy.elements().betweennessCentrality({});
  let maxCentrality = 0;
  cy.nodes().forEach((node: any) => {
    const c = bc.betweenness(node);
    if (c > maxCentrality) maxCentrality = c;
  });
  cy.nodes().forEach((node: any) => {
    const c = bc.betweenness(node);
    const normalized = maxCentrality > 0 ? c / maxCentrality : 0;
    // Gradient from blue (low) to red (high)
    const r = Math.round(normalized * 239 + (1 - normalized) * 99);
    const g = Math.round(normalized * 68 + (1 - normalized) * 102);
    const b = Math.round(normalized * 68 + (1 - normalized) * 241);
    node.style({ 'background-color': `rgb(${r},${g},${b})`, width: 20 + normalized * 30, height: 20 + normalized * 30 });
  });

  const ro = new ResizeObserver(() => { cy.resize(); cy.fit(); });
  ro.observe(container);
  return () => { ro.disconnect(); cy.destroy(); };
}
