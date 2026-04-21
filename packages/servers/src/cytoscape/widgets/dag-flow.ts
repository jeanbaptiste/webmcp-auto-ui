// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cytoscape = (await import('cytoscape')).default;
  try {
    const dagre = (await import('cytoscape-dagre')).default;
    cytoscape.use(dagre);
  } catch { /* fallback to breadthfirst */ }
  container.style.height = container.style.height || "100%";
  container.style.minHeight = container.style.minHeight || "400px";
  const cy = cytoscape({
    container,
    elements: data.elements as any[],
    layout: { name: 'dagre', rankDir: 'TB', ranker: 'longest-path', ...data.layout as any },
    style: data.style as any[] || [
      { selector: 'node', style: { 'background-color': '#0ea5e9', 'label': 'data(label)', 'color': '#fff', 'text-valign': 'center', 'font-size': '10px', 'shape': 'round-rectangle', 'width': 'label', 'padding': '10px', 'text-outline-color': '#1f2937', 'text-outline-width': 2 } },
      { selector: 'edge', style: { 'width': 2, 'line-color': '#64748b', 'target-arrow-color': '#64748b', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
    ],
  });

  (container as any).__exportPng = async (scale: number) => {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim() || '#ffffff';
    return cy.png({ scale: Math.max(2, scale), full: true, bg, output: 'blob' }) as Promise<Blob>;
  };

  const ro = new ResizeObserver(() => { cy.resize(); cy.fit(); });
  ro.observe(container);
  return () => { ro.disconnect(); cy.destroy(); };
}
