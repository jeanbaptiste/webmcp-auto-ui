// @ts-nocheck
// ---------------------------------------------------------------------------
// Scatter + Voronoi widget — scatter plot with voronoi-based hover detection
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { points, title, xLabel, yLabel, colorScheme, showVoronoi = false } = data as any;

  const width = 560;
  const height = 400;
  const margin = { top: title ? 36 : 16, right: 20, bottom: 40, left: 50 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const colors = d3.scaleOrdinal(
    (d3 as any)[`scheme${colorScheme ?? 'Tableau10'}`] ?? d3.schemeTableau10,
  );

  const x = d3.scaleLinear().domain(d3.extent(points, (d) => d.x)).nice().range([0, innerW]);
  const y = d3.scaleLinear().domain(d3.extent(points, (d) => d.y)).nice().range([innerH, 0]);

  const svg = d3.select(container).append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('width', '100%').style('height', 'auto')
    .style('font', '10px sans-serif');

  if (title) svg.append('text').attr('x', width / 2).attr('y', 20).attr('text-anchor', 'middle').style('font-size', '14px').style('font-weight', 'bold').text(title);

  const tooltip = d3.select(container).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', 'rgba(0,0,0,0.8)').style('color', '#fff')
    .style('padding', '4px 8px').style('border-radius', '4px')
    .style('font-size', '12px').style('opacity', '0');

  container.style.position = 'relative';

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(8));
  g.append('g').call(d3.axisLeft(y).ticks(6));

  if (xLabel) g.append('text').attr('x', innerW / 2).attr('y', innerH + 34).attr('text-anchor', 'middle').style('font-size', '11px').text(xLabel);
  if (yLabel) g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -38).attr('text-anchor', 'middle').style('font-size', '11px').text(yLabel);

  // Delaunay for hover detection
  const delaunay = d3.Delaunay.from(points, (d) => x(d.x), (d) => y(d.y));
  const voronoi = delaunay.voronoi([0, 0, innerW, innerH]);

  // Optional voronoi edges
  if (showVoronoi) {
    g.append('path')
      .attr('d', voronoi.render())
      .attr('fill', 'none')
      .attr('stroke', '#ddd')
      .attr('stroke-width', 0.5);
  }

  // Points
  const dots = g.selectAll('circle')
    .data(points)
    .join('circle')
    .attr('cx', (d) => x(d.x))
    .attr('cy', (d) => y(d.y))
    .attr('r', (d) => d.radius ?? 5)
    .attr('fill', (d, i) => d.color ?? colors(String(d.group ?? i % 10)))
    .attr('fill-opacity', 0.8)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1);

  // Voronoi overlay for hit detection
  g.selectAll('path.voronoi-cell')
    .data(points)
    .join('path')
    .attr('class', 'voronoi-cell')
    .attr('d', (_, i) => voronoi.renderCell(i))
    .attr('fill', 'transparent')
    .attr('stroke', 'none')
    .style('cursor', 'crosshair')
    .on('mouseenter', function (event, d) {
      const idx = points.indexOf(d);
      d3.select(dots.nodes()[idx]).attr('r', (d.radius ?? 5) + 3).attr('fill-opacity', 1);
      tooltip.style('opacity', '1').html(`<strong>${d.label ?? `Point`}</strong><br/>x: ${d.x}<br/>y: ${d.y}${d.value != null ? `<br/>Value: ${d.value}` : ''}`);
    })
    .on('mousemove', function (event) {
      const rect = container.getBoundingClientRect();
      tooltip.style('left', `${event.clientX - rect.left + 10}px`).style('top', `${event.clientY - rect.top - 10}px`);
    })
    .on('mouseleave', function (_, d) {
      const idx = points.indexOf(d);
      d3.select(dots.nodes()[idx]).attr('r', d.radius ?? 5).attr('fill-opacity', 0.8);
      tooltip.style('opacity', '0');
    });

  return () => {
    tooltip.remove();
    svg.remove();
  };
}
