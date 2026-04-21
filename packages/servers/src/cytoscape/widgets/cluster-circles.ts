// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cytoscape = (await import('cytoscape')).default;
  container.style.height = container.style.height || "100%";
  container.style.minHeight = container.style.minHeight || "400px";

  // Build compound nodes from group attribute
  const elements = data.elements as any[];
  const groups = new Set<string>();
  for (const el of elements) {
    if (el.data?.group && !el.data?.source) {
      groups.add(el.data.group);
    }
  }
  const compoundElements = [
    ...Array.from(groups).map(g => ({ data: { id: `__group_${g}`, label: g } })),
    ...elements.map(el => {
      if (el.data?.group && !el.data?.source) {
        return { ...el, data: { ...el.data, parent: `__group_${el.data.group}` } };
      }
      return el;
    }),
  ];

  const cy = cytoscape({
    container,
    elements: compoundElements,
    layout: { name: 'cose', animate: true, ...data.layout as any },
    style: data.style as any[] || [
      { selector: 'node[^parent]', style: { 'background-color': '#8b5cf6', 'label': 'data(label)', 'color': '#fff', 'text-valign': 'center', 'font-size': '10px', 'text-outline-color': '#1f2937', 'text-outline-width': 2 } },
      { selector: ':parent', style: { 'background-opacity': 0.08, 'background-color': '#6366f1', 'border-width': 2, 'border-color': '#a5b4fc', 'label': 'data(label)', 'text-valign': 'top', 'font-size': '12px', 'color': '#6366f1' } },
      { selector: 'edge', style: { 'width': 2, 'line-color': '#ccc', 'target-arrow-color': '#ccc', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
    ],
  });
  const ro = new ResizeObserver(() => { cy.resize(); cy.fit(); });
  ro.observe(container);
  return () => { ro.disconnect(); cy.destroy(); };
}
