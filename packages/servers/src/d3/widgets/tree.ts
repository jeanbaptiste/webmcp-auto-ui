// @ts-nocheck
// ---------------------------------------------------------------------------
// Tree widget — hierarchical data as a tidy tree layout
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { root: rawRoot, title, colorScheme, orientation = 'horizontal' } = data as any;

  container.style.position = 'relative';

  const colors = d3.scaleOrdinal(
    (d3 as any)[`scheme${colorScheme ?? 'Tableau10'}`] ?? d3.schemeTableau10,
  );

  const tooltip = d3
    .select(container)
    .append('div')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('background', 'rgba(0,0,0,0.8)')
    .style('color', '#fff')
    .style('padding', '4px 8px')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('opacity', '0');

  const draw = (width: number, height: number) => {
    d3.select(container).selectAll('svg').remove();

    const hierarchy = d3.hierarchy(rawRoot);

    // Dynamic margins — measure longest leaf label so it doesn't get clipped.
    // Approx width @ 11px sans-serif ≈ 6.5px per char; clamp to avoid absurd margins.
    const CHAR_PX = 6.5;
    const leafLabels = hierarchy.leaves().map((n: any) => String(n.data?.name ?? ''));
    const rootLabels = hierarchy.descendants()
      .filter((n: any) => n.children)
      .map((n: any) => String(n.data?.name ?? ''));
    const maxLeafChars = Math.max(0, ...leafLabels.map((s: string) => s.length));
    const maxInnerChars = Math.max(0, ...rootLabels.map((s: string) => s.length));
    const leafPad = Math.min(280, 16 + maxLeafChars * CHAR_PX);
    const innerPad = Math.min(200, 16 + maxInnerChars * CHAR_PX);

    // For horizontal orientation: leaves on the right (text-anchor start) → right needs room;
    // root/children on the left (text-anchor end) → left needs room.
    // For vertical orientation: labels go below nodes, so symmetric padding.
    const margin =
      orientation === 'horizontal'
        ? { top: title ? 36 : 16, right: leafPad, bottom: 16, left: innerPad }
        : { top: title ? 36 : 16, right: 40, bottom: 40, left: 40 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const treeLayout = d3.tree().size(
      orientation === 'horizontal' ? [innerH, innerW] : [innerW, innerH],
    );
    const root = treeLayout(hierarchy);

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'block')
      .style('font', '10px sans-serif');

    if (title) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text(title);
    }

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const getX = (d) => (orientation === 'horizontal' ? d.y : d.x);
    const getY = (d) => (orientation === 'horizontal' ? d.x : d.y);

    // Links
    g.selectAll('path.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1.5)
      .attr('d', (d) => {
        const sx = getX(d.source), sy = getY(d.source);
        const tx = getX(d.target), ty = getY(d.target);
        if (orientation === 'horizontal') {
          return `M${sx},${sy}C${(sx + tx) / 2},${sy} ${(sx + tx) / 2},${ty} ${tx},${ty}`;
        }
        return `M${sx},${sy}C${sx},${(sy + ty) / 2} ${tx},${(sy + ty) / 2} ${tx},${ty}`;
      })
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);

    // Nodes
    const nodes = g
      .selectAll('g.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${getX(d)},${getY(d)})`);

    nodes
      .append('circle')
      .attr('r', 5)
      .attr('fill', (d) => {
        // Tree is the source of truth for color: always color by depth-1 ancestor
        // (iteration) via the ordinal scale. Other renderers (cytoscape, sankey)
        // mirror this palette keyed on the iteration label.
        let node = d;
        while (node.depth > 1) node = node.parent;
        return colors(node.data.name);
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    nodes
      .append('text')
      .attr('dx', (d) => (d.children ? -8 : 8))
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .style('font-size', '11px')
      .text((d) => d.data.name);

    nodes.on('dblclick', (event, d) => {
      event.stopPropagation();
      container.dispatchEvent(new CustomEvent('widget:node-dblclick', {
        detail: {
          nodeId: d.data?.nodeId ?? d.data?.id ?? d.data?.name,
          nodeData: d.data,
        },
        bubbles: true,
      }));
    });

    nodes
      .on('mouseenter', function (event, d) {
        d3.select(this).select('circle').attr('r', 8);
        const path = d.ancestors().reverse().map((a) => a.data.name).join(' / ');
        tooltip.style('opacity', '1').html(`<strong>${path}</strong>`);
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip
          .style('left', `${event.clientX - rect.left + 10}px`)
          .style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).select('circle').attr('r', 5);
        tooltip.style('opacity', '0');
      });
  };

  const getSize = (): [number, number] => [
    container.clientWidth || 600,
    container.clientHeight || 400,
  ];

  draw(...getSize());

  const ro = new ResizeObserver(() => draw(...getSize()));
  ro.observe(container);

  return () => {
    ro.disconnect();
    tooltip.remove();
    d3.select(container).selectAll('svg').remove();
  };
}
