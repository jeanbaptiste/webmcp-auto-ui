// @ts-nocheck
// ---------------------------------------------------------------------------
// Line chart widget — time series or XY data as lines
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { series, title, xLabel, yLabel, colorScheme, curve = 'natural' } = data as any;

  container.style.position = 'relative';

  const colors = d3.scaleOrdinal(
    (d3 as any)[`scheme${colorScheme ?? 'Tableau10'}`] ?? d3.schemeTableau10,
  );

  const curveMap = {
    linear: d3.curveLinear,
    natural: d3.curveNatural,
    step: d3.curveStep,
    basis: d3.curveBasis,
    cardinal: d3.curveCardinal,
    monotone: d3.curveMonotoneX,
  };

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

    const margin = { top: title ? 36 : 16, right: 20, bottom: 40, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const allPoints = series.flatMap((s) => s.points);
    const x = d3.scaleLinear()
      .domain(d3.extent(allPoints, (p) => p.x))
      .nice()
      .range([0, innerW]);
    const y = d3.scaleLinear()
      .domain(d3.extent(allPoints, (p) => p.y))
      .nice()
      .range([innerH, 0]);

    const lineGen = d3.line()
      .x((d) => x(d.x))
      .y((d) => y(d.y))
      .curve(curveMap[curve] ?? d3.curveNatural);

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

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(8));

    g.append('g').call(d3.axisLeft(y).ticks(6));

    if (xLabel) {
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 34)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .text(xLabel);
    }

    if (yLabel) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerH / 2)
        .attr('y', -38)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .text(yLabel);
    }

    // Lines
    series.forEach((s, i) => {
      const path = g.append('path')
        .datum(s.points)
        .attr('fill', 'none')
        .attr('stroke', s.color ?? colors(String(i)))
        .attr('stroke-width', 2.5)
        .attr('d', lineGen);

      const totalLen = path.node().getTotalLength();
      path
        .attr('stroke-dasharray', `${totalLen} ${totalLen}`)
        .attr('stroke-dashoffset', totalLen)
        .transition()
        .duration(800)
        .delay(i * 150)
        .attr('stroke-dashoffset', 0);

      // Dots
      g.selectAll(`circle.s${i}`)
        .data(s.points)
        .join('circle')
        .attr('class', `s${i}`)
        .attr('cx', (d) => x(d.x))
        .attr('cy', (d) => y(d.y))
        .attr('r', 3)
        .attr('fill', s.color ?? colors(String(i)))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('r', 6);
          tooltip
            .style('opacity', '1')
            .html(`<strong>${s.label ?? `Series ${i + 1}`}</strong><br/>x: ${d.x}<br/>y: ${d.y}`);
        })
        .on('mousemove', function (event) {
          const rect = container.getBoundingClientRect();
          tooltip
            .style('left', `${event.clientX - rect.left + 10}px`)
            .style('top', `${event.clientY - rect.top - 10}px`);
        })
        .on('mouseleave', function () {
          d3.select(this).attr('r', 3);
          tooltip.style('opacity', '0');
        });
    });

    // Legend
    if (series.length > 1) {
      const legend = svg.append('g').attr('transform', `translate(${margin.left + 10},${margin.top})`);
      series.forEach((s, i) => {
        const row = legend.append('g').attr('transform', `translate(0,${i * 16})`);
        row.append('rect').attr('width', 12).attr('height', 12).attr('fill', s.color ?? colors(String(i)));
        row.append('text').attr('x', 16).attr('y', 10).style('font-size', '10px').text(s.label ?? `Series ${i + 1}`);
      });
    }
  };

  const getSize = (): [number, number] => [
    container.clientWidth || 560,
    container.clientHeight || 360,
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
