// @ts-nocheck
// ---------------------------------------------------------------------------
// Force-directed graph widget — nodes and links with physics simulation
// ---------------------------------------------------------------------------

interface GraphNode {
  id: string;
  label?: string;
  group?: number;
  radius?: number;
  // d3 simulation adds these:
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value?: number;
}

interface ForceGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  title?: string;
  colorScheme?: string;
}

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { nodes, links, title, colorScheme } =
    data as unknown as ForceGraphData;

  const width = 500;
  const height = 400;

  const colors = d3.scaleOrdinal(
    (d3 as any)[`scheme${colorScheme ?? 'Tableau10'}`] ?? d3.schemeTableau10,
  );

  // Clone data so simulation doesn't mutate the original
  const simNodes: GraphNode[] = nodes.map((d) => ({ ...d }));
  const simLinks: GraphLink[] = links.map((d) => ({ ...d }));

  const simulation = d3
    .forceSimulation(simNodes as any)
    .force(
      'link',
      d3
        .forceLink(simLinks as any)
        .id((d: any) => d.id)
        .distance(60),
    )
    .force('charge', d3.forceManyBody().strength(-120))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide().radius(20));

  const svg = d3
    .select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('width', '100%')
    .style('height', 'auto')
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

  // Tooltip
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

  container.style.position = 'relative';

  // Links
  const link = svg
    .append('g')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .selectAll('line')
    .data(simLinks)
    .join('line')
    .attr('stroke-width', (d) => Math.sqrt(d.value ?? 1));

  // Nodes
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

  // Drag behavior
  node.call(
    d3
      .drag<SVGCircleElement, GraphNode>()
      .on('start', (event, d: any) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d: any) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d: any) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }) as any,
  );

  // Labels
  const label = svg
    .append('g')
    .selectAll('text')
    .data(simNodes)
    .join('text')
    .text((d) => d.label ?? d.id)
    .attr('font-size', '10px')
    .attr('dx', 12)
    .attr('dy', '0.35em');

  // Hover
  node
    .on('mouseenter', function (event: MouseEvent, d: GraphNode) {
      d3.select(this).attr('r', (d.radius ?? 8) + 3);
      const groupStr = d.group != null ? `<br/>Group: ${d.group}` : '';
      tooltip
        .style('opacity', '1')
        .html(`<strong>${d.label ?? d.id}</strong>${groupStr}`);
    })
    .on('mousemove', function (event: MouseEvent) {
      const rect = container.getBoundingClientRect();
      tooltip
        .style('left', `${event.clientX - rect.left + 10}px`)
        .style('top', `${event.clientY - rect.top - 10}px`);
    })
    .on('mouseleave', function (_, d: GraphNode) {
      d3.select(this).attr('r', d.radius ?? 8);
      tooltip.style('opacity', '0');
    });

  // Simulation tick
  simulation.on('tick', () => {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);

    node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);

    label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
  });

  // Fade in
  svg.style('opacity', '0').transition().duration(400).style('opacity', '1');

  return () => {
    simulation.stop();
    tooltip.remove();
    svg.remove();
  };
}
