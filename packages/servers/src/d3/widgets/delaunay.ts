// @ts-nocheck
// ---------------------------------------------------------------------------
// Delaunay triangulation widget — triangulate a set of points
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { points, title, showPoints = true, colorScheme } = data as any;

  container.style.position = 'relative';

  const colors = d3.scaleOrdinal(
    (d3 as any)[`scheme${colorScheme ?? 'Tableau10'}`] ?? d3.schemeTableau10,
  );

  const tooltip = d3.select(container).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', 'rgba(0,0,0,0.8)').style('color', '#fff')
    .style('padding', '4px 8px').style('border-radius', '4px')
    .style('font-size', '12px').style('opacity', '0');

  const draw = (width: number, height: number) => {
    d3.select(container).selectAll('svg').remove();

    const margin = { top: title ? 36 : 16, right: 16, bottom: 16, left: 16 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const xExtent = d3.extent(points, (d) => d.x);
    const yExtent = d3.extent(points, (d) => d.y);
    const xPad = (xExtent[1] - xExtent[0]) * 0.1 || 20;
    const yPad = (yExtent[1] - yExtent[0]) * 0.1 || 20;

    const x = d3.scaleLinear().domain([xExtent[0] - xPad, xExtent[1] + xPad]).range([0, innerW]);
    const y = d3.scaleLinear().domain([yExtent[0] - yPad, yExtent[1] + yPad]).range([innerH, 0]);

    const delaunay = d3.Delaunay.from(points, (d) => x(d.x), (d) => y(d.y));

    const svg = d3.select(container).append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%').style('height', '100%')
      .style('display', 'block')
      .style('font', '10px sans-serif');

    if (title) svg.append('text').attr('x', width / 2).attr('y', 20).attr('text-anchor', 'middle').style('font-size', '14px').style('font-weight', 'bold').text(title);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Render triangles
    const triangles = [];
    for (let i = 0; i < delaunay.triangles.length; i += 3) {
      triangles.push([
        delaunay.triangles[i],
        delaunay.triangles[i + 1],
        delaunay.triangles[i + 2],
      ]);
    }

    g.selectAll('path.tri')
      .data(triangles)
      .join('path')
      .attr('class', 'tri')
      .attr('d', (tri) => {
        const p0 = points[tri[0]], p1 = points[tri[1]], p2 = points[tri[2]];
        return `M${x(p0.x)},${y(p0.y)}L${x(p1.x)},${y(p1.y)}L${x(p2.x)},${y(p2.y)}Z`;
      })
      .attr('fill', (_, i) => colors(String(i % 10)))
      .attr('fill-opacity', 0.15)
      .attr('stroke', '#666')
      .attr('stroke-width', 0.8)
      .style('opacity', 0)
      .transition().duration(500).delay((_, i) => i * 10)
      .style('opacity', 1);

    if (showPoints) {
      g.selectAll('circle')
        .data(points)
        .join('circle')
        .attr('cx', (d) => x(d.x))
        .attr('cy', (d) => y(d.y))
        .attr('r', 4)
        .attr('fill', '#333')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('r', 7);
          tooltip.style('opacity', '1').html(`<strong>${d.label ?? `(${d.x}, ${d.y})`}</strong>`);
        })
        .on('mousemove', function (event) {
          const rect = container.getBoundingClientRect();
          tooltip.style('left', `${event.clientX - rect.left + 10}px`).style('top', `${event.clientY - rect.top - 10}px`);
        })
        .on('mouseleave', function () {
          d3.select(this).attr('r', 4);
          tooltip.style('opacity', '0');
        });
    }
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
    tooltip.remove();
    d3.select(container).selectAll('svg').remove();
  };
}
