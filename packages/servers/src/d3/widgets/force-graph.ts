// @ts-nocheck
// ---------------------------------------------------------------------------
// Force-directed graph widget — nodes and links with physics simulation
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { nodes, links, title, colorScheme } = data as any;

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

  let activeSimulation: any = null;

  const draw = (width: number, height: number) => {
    // Stop previous simulation and clear SVG
    if (activeSimulation) {
      activeSimulation.stop();
      activeSimulation = null;
    }
    d3.select(container).selectAll('svg').remove();

    const simNodes = nodes.map((d) => ({ ...d }));
    const simLinks = links.map((d) => ({ ...d }));

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3.forceLink(simLinks).id((d) => d.id).distance(60),
      )
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(20));

    activeSimulation = simulation;

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

    const link = svg
      .append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke-width', (d) => Math.sqrt(d.value ?? 1));

    const node = svg
      .append('g')
      .selectAll('circle')
      .data(simNodes)
      .join('circle')
      .attr('r', (d) => d.radius ?? 8)
      .attr('fill', (d) => colors(String(d.group ?? 0)))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'grab');

    node.call(
      d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }),
    );

    const label = svg
      .append('g')
      .selectAll('text')
      .data(simNodes)
      .join('text')
      .text((d) => d.label ?? d.id)
      .attr('font-size', '10px')
      .attr('dx', 12)
      .attr('dy', '0.35em');

    node
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('r', (d.radius ?? 8) + 3);
        const groupStr = d.group != null ? `<br/>Group: ${d.group}` : '';
        tooltip.style('opacity', '1').html(`<strong>${d.label ?? d.id}</strong>${groupStr}`);
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip
          .style('left', `${event.clientX - rect.left + 10}px`)
          .style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).attr('r', d.radius ?? 8);
        tooltip.style('opacity', '0');
      });

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
      label.attr('x', (d) => d.x).attr('y', (d) => d.y);
    });

    svg.style('opacity', '0').transition().duration(400).style('opacity', '1');
  };

  const getSize = (): [number, number] => [
    container.clientWidth || 500,
    container.clientHeight || 400,
  ];

  draw(...getSize());

  const ro = new ResizeObserver(() => draw(...getSize()));
  ro.observe(container);

  return () => {
    ro.disconnect();
    if (activeSimulation) activeSimulation.stop();
    tooltip.remove();
    d3.select(container).selectAll('svg').remove();
  };
}
