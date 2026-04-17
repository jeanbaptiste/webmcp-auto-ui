// @ts-nocheck
// ---------------------------------------------------------------------------
// Symbol map widget — points on a map with sized/colored symbols
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { geojson, points, title, colorScheme, projection: projName = 'geoMercator' } = data as any;

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

    const proj = (d3[projName] ?? d3.geoMercator)().fitSize([width, height], geojson);
    const pathGen = d3.geoPath().projection(proj);

    const svg = d3.select(container).append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%').style('height', '100%')
      .style('display', 'block')
      .style('font', '10px sans-serif');

    if (title) svg.append('text').attr('x', width / 2).attr('y', 20).attr('text-anchor', 'middle').style('font-size', '14px').style('font-weight', 'bold').text(title);

    // Base map
    const features = geojson?.features || [];
    svg.selectAll('path')
      .data(features)
      .join('path')
      .attr('d', pathGen)
      .attr('fill', '#eee')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 0.5);

    // Size scale
    const valueExtent = d3.extent(points, (d) => d.value ?? 1);
    const sizeScale = d3.scaleSqrt().domain(valueExtent).range([4, 24]);

    // Points
    const circles = svg.selectAll('circle')
      .data(points)
      .join('circle')
      .attr('cx', (d) => proj([d.lon, d.lat])?.[0] ?? 0)
      .attr('cy', (d) => proj([d.lon, d.lat])?.[1] ?? 0)
      .attr('r', 0)
      .attr('fill', (d, i) => d.color ?? colors(String(d.group ?? i)))
      .attr('fill-opacity', 0.7)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer');

    circles
      .transition().duration(600).delay((_, i) => i * 30)
      .attr('r', (d) => sizeScale(d.value ?? 1));

    circles
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('fill-opacity', 1).attr('stroke-width', 2);
        tooltip.style('opacity', '1').html(`<strong>${d.label ?? `(${d.lat}, ${d.lon})`}</strong>${d.value != null ? `<br/>Value: ${d.value}` : ''}`);
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip.style('left', `${event.clientX - rect.left + 10}px`).style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).attr('fill-opacity', 0.7).attr('stroke-width', 1);
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
