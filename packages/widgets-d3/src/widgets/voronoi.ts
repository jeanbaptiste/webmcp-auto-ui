// @ts-nocheck
// ---------------------------------------------------------------------------
// Voronoi tessellation widget — partition space by nearest point
// ---------------------------------------------------------------------------

interface VoronoiPoint {
  x: number;
  y: number;
  label?: string;
  value?: number;
}

interface VoronoiData {
  points: VoronoiPoint[];
  title?: string;
  showPoints?: boolean;
  showLabels?: boolean;
  colorScheme?: string;
}

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const {
    points,
    title,
    showPoints = true,
    showLabels = true,
    colorScheme,
  } = data as unknown as VoronoiData;

  const width = 500;
  const height = 400;
  const margin = { top: title ? 36 : 16, right: 16, bottom: 16, left: 16 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const colors = d3.scaleOrdinal(
    (d3 as any)[`scheme${colorScheme ?? 'Tableau10'}`] ?? d3.schemeTableau10,
  );

  const xExtent = d3.extent(points, (d) => d.x) as [number, number];
  const yExtent = d3.extent(points, (d) => d.y) as [number, number];

  const xPad = (xExtent[1] - xExtent[0]) * 0.1 || 20;
  const yPad = (yExtent[1] - yExtent[0]) * 0.1 || 20;

  const x = d3
    .scaleLinear()
    .domain([xExtent[0] - xPad, xExtent[1] + xPad])
    .range([0, innerW]);
  const y = d3
    .scaleLinear()
    .domain([yExtent[0] - yPad, yExtent[1] + yPad])
    .range([innerH, 0]);

  const delaunay = d3.Delaunay.from(
    points,
    (d) => x(d.x),
    (d) => y(d.y),
  );
  const voronoi = delaunay.voronoi([0, 0, innerW, innerH]);

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

  const g = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Voronoi cells
  const cells = g
    .selectAll('path')
    .data(points)
    .join('path')
    .attr('d', (_, i) => voronoi.renderCell(i))
    .attr('fill', ((_: unknown, i: number) => colors(String(i))) as unknown as string)
    .attr('fill-opacity', 0.3)
    .attr('stroke', '#333')
    .attr('stroke-width', 1)
    .style('opacity', 0);

  cells
    .transition()
    .duration(500)
    .delay((_, i) => i * 30)
    .style('opacity', 1);

  cells
    .on('mouseenter', function (event: MouseEvent, d: VoronoiPoint) {
      d3.select(this).attr('fill-opacity', 0.6);
      const label = d.label ?? `(${d.x}, ${d.y})`;
      const valueStr = d.value != null ? `<br/>Value: ${d.value}` : '';
      tooltip.style('opacity', '1').html(`<strong>${label}</strong>${valueStr}`);
    })
    .on('mousemove', function (event: MouseEvent) {
      const rect = container.getBoundingClientRect();
      tooltip
        .style('left', `${event.clientX - rect.left + 10}px`)
        .style('top', `${event.clientY - rect.top - 10}px`);
    })
    .on('mouseleave', function () {
      d3.select(this).attr('fill-opacity', 0.3);
      tooltip.style('opacity', '0');
    });

  // Points
  if (showPoints) {
    g.selectAll('circle')
      .data(points)
      .join('circle')
      .attr('cx', (d) => x(d.x))
      .attr('cy', (d) => y(d.y))
      .attr('r', 4)
      .attr('fill', '#333')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);
  }

  // Labels
  if (showLabels) {
    g.selectAll('text.label')
      .data(points.filter((d) => d.label))
      .join('text')
      .attr('class', 'label')
      .attr('x', (d) => x(d.x))
      .attr('y', (d) => y(d.y) - 8)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .text((d) => d.label!);
  }

  return () => {
    tooltip.remove();
    svg.remove();
  };
}
