// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cytoscape = (await import('cytoscape')).default;
  container.style.height = container.style.height || "100%";
  container.style.minHeight = container.style.minHeight || "400px";

  // Compute x positions from time values
  const elements = data.elements as any[];
  const nodes = elements.filter(el => !el.data?.source);
  const times = nodes.map(n => n.data?.time ?? 0);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const range = maxTime - minTime || 1;

  // Assign positions based on time
  const width = 800;
  const positioned = elements.map((el, i) => {
    if (!el.data?.source && el.data?.time != null) {
      const x = ((el.data.time - minTime) / range) * (width - 100) + 50;
      return { ...el, position: { x, y: 100 + (i % 5) * 60 } };
    }
    return el;
  });

  const cy = cytoscape({
    container,
    elements: positioned,
    layout: { name: 'preset', ...data.layout as any },
    style: data.style as any[] || [
      { selector: 'node', style: { 'background-color': '#8b5cf6', 'label': 'data(label)', 'color': '#fff', 'text-valign': 'center', 'font-size': '10px', 'text-outline-color': '#1f2937', 'text-outline-width': 2 } },
      { selector: 'edge', style: { 'width': 2, 'line-color': '#94a3b8', 'target-arrow-color': '#94a3b8', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
    ],
  });
  const ro = new ResizeObserver(() => { cy.resize(); cy.fit(); });
  ro.observe(container);
  return () => { ro.disconnect(); cy.destroy(); };
}
