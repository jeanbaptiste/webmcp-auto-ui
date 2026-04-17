// @ts-nocheck
// ---------------------------------------------------------------------------
// Dendrogram widget — hierarchical clustering as a radial tree
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { root: rawRoot, title, colorScheme, radial = true } = data as any;

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

    const radius = Math.min(width, height) / 2 - 40;

    const hierarchy = d3.hierarchy(rawRoot);
    let root;

    if (radial) {
      const cluster = d3.cluster().size([2 * Math.PI, radius]);
      root = cluster(hierarchy);
    } else {
      const cluster = d3.cluster().size([height - 80, width - 160]);
      root = cluster(hierarchy);
    }

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
      .attr('transform', radial ? `translate(${width / 2},${height / 2})` : 'translate(80,40)');

    if (radial) {
      // Radial links
      g.selectAll('path.link')
        .data(root.links())
        .join('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 1.5)
        .attr('d', d3.linkRadial().angle((d) => d.x).radius((d) => d.y))
        .style('opacity', 0)
        .transition()
        .duration(500)
        .style('opacity', 1);

      // Radial nodes
      const nodes = g
        .selectAll('g.node')
        .data(root.descendants())
        .join('g')
        .attr('class', 'node')
        .attr('transform', (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`);

      nodes
        .append('circle')
        .attr('r', 4)
        .attr('fill', (d) => {
          let node = d;
          while (node.depth > 1) node = node.parent;
          return colors(node.data.name);
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 1);

      nodes
        .append('text')
        .attr('dy', '0.35em')
        .attr('x', (d) => (d.x < Math.PI ? 6 : -6))
        .attr('text-anchor', (d) => (d.x < Math.PI ? 'start' : 'end'))
        .attr('transform', (d) => (d.x >= Math.PI ? 'rotate(180)' : ''))
        .style('font-size', '9px')
        .text((d) => (!d.children ? d.data.name : ''));
    } else {
      // Linear links
      g.selectAll('path.link')
        .data(root.links())
        .join('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 1.5)
        .attr('d', (d) => `M${d.source.y},${d.source.x}H${d.target.y}V${d.target.x}`)
        .style('opacity', 0)
        .transition()
        .duration(500)
        .style('opacity', 1);

      const nodes = g
        .selectAll('g.node')
        .data(root.descendants())
        .join('g')
        .attr('class', 'node')
        .attr('transform', (d) => `translate(${d.y},${d.x})`);

      nodes
        .append('circle')
        .attr('r', 4)
        .attr('fill', (d) => {
          let node = d;
          while (node.depth > 1) node = node.parent;
          return colors(node.data.name);
        });

      nodes
        .append('text')
        .attr('dx', (d) => (d.children ? -8 : 8))
        .attr('dy', '0.35em')
        .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
        .style('font-size', '10px')
        .text((d) => d.data.name);
    }

    g.selectAll('g.node')
      .on('mouseenter', function (event, d) {
        d3.select(this).select('circle').attr('r', 7);
        tooltip.style('opacity', '1').html(`<strong>${d.data.name}</strong><br/>Depth: ${d.depth}`);
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip
          .style('left', `${event.clientX - rect.left + 10}px`)
          .style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).select('circle').attr('r', 4);
        tooltip.style('opacity', '0');
      });
  };

  const getSize = (): [number, number] => [
    container.clientWidth || 500,
    container.clientHeight || 500,
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
