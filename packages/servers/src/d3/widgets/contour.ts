// @ts-nocheck
// ---------------------------------------------------------------------------
// Contour density widget — 2D kernel density estimation
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { points, title, bandwidth = 20, thresholds = 10, colorScheme = 'Blues' } = data as any;

  const width = 500;
  const height = 400;
  const margin = { top: title ? 36 : 16, right: 16, bottom: 32, left: 40 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xExtent = d3.extent(points, (d) => d[0]);
  const yExtent = d3.extent(points, (d) => d[1]);

  const x = d3.scaleLinear().domain(xExtent).nice().range([0, innerW]);
  const y = d3.scaleLinear().domain(yExtent).nice().range([innerH, 0]);

  const density = d3
    .contourDensity()
    .x((d) => x(d[0]))
    .y((d) => y(d[1]))
    .size([innerW, innerH])
    .bandwidth(bandwidth)
    .thresholds(thresholds)(points);

  const colorScale = d3.scaleSequential(
    (d3 as any)[`interpolate${colorScheme}`] ?? d3.interpolateBlues,
  ).domain([0, d3.max(density, (d) => d.value) ?? 1]);

  const svg = d3.select(container).append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('width', '100%').style('height', 'auto')
    .style('font', '10px sans-serif');

  if (title) svg.append('text').attr('x', width / 2).attr('y', 20).attr('text-anchor', 'middle').style('font-size', '14px').style('font-weight', 'bold').text(title);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  g.selectAll('path')
    .data(density)
    .join('path')
    .attr('fill', (d) => colorScale(d.value))
    .attr('stroke', 'none')
    .attr('d', d3.geoPath())
    .style('opacity', 0)
    .transition().duration(600).delay((_, i) => i * 40)
    .style('opacity', 0.8);

  g.selectAll('circle')
    .data(points)
    .join('circle')
    .attr('cx', (d) => x(d[0]))
    .attr('cy', (d) => y(d[1]))
    .attr('r', 2)
    .attr('fill', '#333')
    .attr('fill-opacity', 0.4);

  g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6));
  g.append('g').call(d3.axisLeft(y).ticks(6));

  const tooltip = d3.select(container).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', 'rgba(0,0,0,0.8)').style('color', '#fff')
    .style('padding', '4px 8px').style('border-radius', '4px')
    .style('font-size', '12px').style('opacity', '0');

  container.style.position = 'relative';

  g.selectAll('circle')
    .on('mouseenter', function (event, d) {
      tooltip.style('opacity', '1').html(`(${d[0]}, ${d[1]})`);
    })
    .on('mousemove', function (event) {
      const rect = container.getBoundingClientRect();
      tooltip.style('left', `${event.clientX - rect.left + 10}px`).style('top', `${event.clientY - rect.top - 10}px`);
    })
    .on('mouseleave', function () {
      tooltip.style('opacity', '0');
    });

  return () => {
    tooltip.remove();
    svg.remove();
  };
}
