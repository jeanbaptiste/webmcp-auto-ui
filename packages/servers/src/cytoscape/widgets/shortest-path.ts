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
      { selector: 'node', style: { 'background-color': '#64748b', 'label': 'data(label)', 'color': '#fff', 'text-valign': 'center', 'font-size': '10px', 'text-outline-color': '#1f2937', 'text-outline-width': 2 } },
      { selector: 'edge', style: { 'width': 2, 'line-color': '#e2e8f0', 'target-arrow-color': '#e2e8f0', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
      { selector: '.highlighted', style: { 'background-color': '#ef4444', 'line-color': '#ef4444', 'target-arrow-color': '#ef4444', 'width': 4 } },
    ],
  });

  (container as any).__exportPng = async (scale: number) => {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim() || '#ffffff';
    return cy.png({ scale: Math.max(2, scale), full: true, bg, output: 'blob' }) as Promise<Blob>;
  };


  // Find shortest path using Dijkstra
  const sourceNode = cy.getElementById(data.source as string);
  const targetNode = cy.getElementById(data.target as string);
  if (sourceNode.length && targetNode.length) {
    const dijkstra = cy.elements().dijkstra({
      root: sourceNode,
      weight: (edge: any) => edge.data('weight') ?? 1,
    });
    const path = dijkstra.pathTo(targetNode);
    path.addClass('highlighted');
    sourceNode.style({ 'background-color': '#22c55e', 'width': 30, 'height': 30 });
    targetNode.style({ 'background-color': '#ef4444', 'width': 30, 'height': 30 });
  }

  const ro = new ResizeObserver(() => { cy.resize(); cy.fit(); });
  ro.observe(container);
  return () => { ro.disconnect(); cy.destroy(); };
}
