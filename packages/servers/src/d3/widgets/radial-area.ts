// @ts-nocheck
// ---------------------------------------------------------------------------
// Radial area chart widget — filled radar/spider chart
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { series, title, colorScheme, labels } = data as any;

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

    const radius = Math.min(width, height) / 2 - 50;

    const n = series[0]?.points?.length ?? 0;
    const angleSlice = (2 * Math.PI) / n;

    const maxVal = d3.max(series.flatMap((s) => s.points.map((p) => p.value)));
    const r = d3.scaleLinear().domain([0, maxVal]).range([0, radius]);

    const svg = d3.select(container).append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%').style('height', '100%')
      .style('display', 'block')
      .style('font', '10px sans-serif');

    if (title) svg.append('text').attr('x', width / 2).attr('y', 20).attr('text-anchor', 'middle').style('font-size', '14px').style('font-weight', 'bold').text(title);

    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

    // Grid
    const ticks = r.ticks(4);
    g.selectAll('circle.grid')
      .data(ticks)
      .join('circle')
      .attr('class', 'grid')
      .attr('r', (d) => r(d))
      .attr('fill', 'none')
      .attr('stroke', '#ddd')
      .attr('stroke-dasharray', '2,3');

    // Axes
    for (let i = 0; i < n; i++) {
      const angle = angleSlice * i - Math.PI / 2;
      g.append('line')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', radius * Math.cos(angle))
        .attr('y2', radius * Math.sin(angle))
        .attr('stroke', '#eee');
      g.append('text')
        .attr('x', (radius + 14) * Math.cos(angle))
        .attr('y', (radius + 14) * Math.sin(angle))
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('font-size', '10px')
        .text(labels?.[i] ?? `${i}`);
    }

    // Areas
    const areaGen = d3.areaRadial()
      .angle((d, i) => angleSlice * i)
      .innerRadius(0)
      .outerRadius((d) => r(d.value))
      .curve(d3.curveLinearClosed);

    series.forEach((s, si) => {
      const color = s.color ?? colors(String(si));

      g.append('path')
        .datum(s.points)
        .attr('fill', color)
        .attr('fill-opacity', 0.25)
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('d', areaGen)
        .style('opacity', 0)
        .transition().duration(600).delay(si * 150)
        .style('opacity', 1);

      // Dots
      s.points.forEach((p, pi) => {
        const angle = angleSlice * pi - Math.PI / 2;
        g.append('circle')
          .attr('cx', r(p.value) * Math.cos(angle))
          .attr('cy', r(p.value) * Math.sin(angle))
          .attr('r', 4)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .on('mouseenter', function (event) {
            d3.select(this).attr('r', 7);
            tooltip.style('opacity', '1').html(`<strong>${s.label ?? `Series ${si + 1}`}</strong><br/>${labels?.[pi] ?? pi}: ${p.value}`);
          })
          .on('mousemove', function (event) {
            const rect = container.getBoundingClientRect();
            tooltip.style('left', `${event.clientX - rect.left + 10}px`).style('top', `${event.clientY - rect.top - 10}px`);
          })
          .on('mouseleave', function () {
            d3.select(this).attr('r', 4);
            tooltip.style('opacity', '0');
          });
      });
    });

    // Legend
    if (series.length > 1) {
      const legend = svg.append('g').attr('transform', `translate(10,${height - series.length * 16 - 10})`);
      series.forEach((s, i) => {
        const row = legend.append('g').attr('transform', `translate(0,${i * 16})`);
        row.append('rect').attr('width', 12).attr('height', 12).attr('fill', s.color ?? colors(String(i)));
        row.append('text').attr('x', 16).attr('y', 10).style('font-size', '10px').text(s.label ?? `Series ${i + 1}`);
      });
    }
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
