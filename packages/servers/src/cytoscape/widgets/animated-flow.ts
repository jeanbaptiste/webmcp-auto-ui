// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cytoscape = (await import('cytoscape')).default;
  container.style.height = container.style.height || "100%";
  container.style.minHeight = container.style.minHeight || "400px";
  container.style.position = 'relative';

  const tooltip = document.createElement('div');
  tooltip.style.position = 'absolute';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.background = 'rgba(0,0,0,0.8)';
  tooltip.style.color = '#fff';
  tooltip.style.padding = '4px 8px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.fontSize = '12px';
  tooltip.style.opacity = '0';
  tooltip.style.zIndex = '10';
  tooltip.style.maxWidth = '360px';
  tooltip.style.whiteSpace = 'pre-wrap';
  container.appendChild(tooltip);

  const cy = cytoscape({
    container,
    elements: data.elements as any[],
    layout: { name: 'cose', animate: true, ...data.layout as any },
    style: data.style as any[] || [
      { selector: 'node', style: { 'background-color': '#8b5cf6', 'label': 'data(label)', 'color': '#fff', 'text-valign': 'center', 'font-size': '10px', 'text-outline-color': '#1f2937', 'text-outline-width': 2 } },
      { selector: 'edge', style: { 'width': (el: any) => 2 + (el.data('flow') ?? 0) * 0.5, 'line-color': '#6366f1', 'target-arrow-color': '#6366f1', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'line-style': 'dashed', 'line-dash-pattern': [6, 3] } },
    ],
  });

  // Animate dashes (marching ants effect)
  let offset = 0;
  let destroyed = false;
  const isDead = () => destroyed || !cy || (typeof cy.destroyed === 'function' && cy.destroyed());
  const interval = setInterval(() => {
    if (isDead()) return;
    offset = (offset + 1) % 9;
    try { cy.edges().style({ 'line-dash-offset': -offset }); } catch { /* post-destroy */ }
  }, 100);

  // Emit DOM CustomEvent on node double-tap so host apps can open details.
  cy.on('dbltap', 'node', (evt) => {
    if (isDead()) return;
    const target = evt.target;
    container.dispatchEvent(new CustomEvent('widget:node-dblclick', {
      detail: { nodeId: target.data('id'), nodeData: target.data() },
      bubbles: true,
    }));
  });

  // Hover tooltip with summary
  cy.on('mouseover', 'node', (evt) => {
    if (isDead()) return;
    const d = evt.target.data();
    const text = d.summary ?? d.label ?? '';
    tooltip.textContent = String(text);
    tooltip.style.opacity = '1';
  });
  cy.on('mousemove', 'node', (evt) => {
    if (isDead()) return;
    const oe = evt.originalEvent as MouseEvent | undefined;
    if (!oe) return;
    const rect = container.getBoundingClientRect();
    tooltip.style.left = `${oe.clientX - rect.left + 10}px`;
    tooltip.style.top = `${oe.clientY - rect.top - 10}px`;
  });
  cy.on('mouseout', 'node', () => {
    if (isDead()) return;
    tooltip.style.opacity = '0';
  });

  let rafId: number | null = null;
  const ro = new ResizeObserver(() => {
    if (isDead()) return;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (isDead()) return;
      try {
        cy.resize();
        cy.fit();
      } catch { /* post-destroy */ }
    });
  });
  ro.observe(container);
  return () => {
    destroyed = true;
    ro.disconnect();
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    clearInterval(interval);
    try { cy.destroy(); } catch { /* already gone */ }
    tooltip.remove();
  };
}
