// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cytoscape = (await import('cytoscape')).default;
  // Use cose-bilkent for better compound node handling
  try {
    const coseBilkent = (await import('cytoscape-cose-bilkent')).default;
    cytoscape.use(coseBilkent);
  } catch { /* fallback to cose */ }
  container.style.height = container.style.height || "100%";
  container.style.minHeight = container.style.minHeight || "400px";
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

  (container as any).__exportPng = async (scale: number) => {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim() || '#ffffff';
    return cy.png({ scale: Math.max(2, scale), full: true, bg, output: 'blob' }) as Promise<Blob>;
  };

  const ro = new ResizeObserver(() => { cy.resize(); cy.fit(); });
  ro.observe(container);
  return () => { ro.disconnect(); cy.destroy(); };
}
