// @ts-nocheck
// ---------------------------------------------------------------------------
// Density map widget — heatmap-style 2D binning
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { points, title, binsX = 30, binsY = 30, colorScheme = 'YlOrRd' } = data as any;

  container.style.position = 'relative';

  const tooltip = d3.select(container).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', 'rgba(0,0,0,0.8)').style('color', '#fff')
    .style('padding', '4px 8px').style('border-radius', '4px')
    .style('font-size', '12px').style('opacity', '0');

  const draw = (width: number, height: number) => {
    d3.select(container).selectAll('svg').remove();

    const margin = { top: title ? 36 : 16, right: 16, bottom: 32, left: 40 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const xExtent = d3.extent(points, (d) => d[0]);
    const yExtent = d3.extent(points, (d) => d[1]);

    const x = d3.scaleLinear().domain(xExtent).nice().range([0, innerW]);
    const y = d3.scaleLinear().domain(yExtent).nice().range([innerH, 0]);

    // Manual 2D binning
    const cellW = innerW / binsX;
    const cellH = innerH / binsY;
    const bins = Array.from({ length: binsX * binsY }, () => 0);

    points.forEach((p) => {
      const bx = Math.min(binsX - 1, Math.max(0, Math.floor((x(p[0]) / innerW) * binsX)));
      const by = Math.min(binsY - 1, Math.max(0, Math.floor(((innerH - y(p[1])) / innerH) * binsY)));
      bins[by * binsX + bx]++;
    });

    const maxCount = d3.max(bins);
    const colorScale = d3.scaleSequential(
      (d3 as any)[`interpolate${colorScheme}`] ?? d3.interpolateYlOrRd,
    ).domain([0, maxCount]);

    const svg = d3.select(container).append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%').style('height', '100%')
      .style('display', 'block')
      .style('font', '10px sans-serif');

    if (title) svg.append('text').attr('x', width / 2).attr('y', 20).attr('text-anchor', 'middle').style('font-size', '14px').style('font-weight', 'bold').text(title);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const rects = g.selectAll('rect')
      .data(bins)
      .join('rect')
      .attr('x', (_, i) => (i % binsX) * cellW)
      .attr('y', (_, i) => Math.floor(i / binsX) * cellH)
      .attr('width', cellW + 0.5)
      .attr('height', cellH + 0.5)
      .attr('fill', (d) => (d > 0 ? colorScale(d) : '#f8f8f8'))
      .style('opacity', 0);

    rects.transition().duration(600).style('opacity', 1);

    rects
      .on('mouseenter', function (event, d) {
        if (d > 0) {
          d3.select(this).attr('stroke', '#333').attr('stroke-width', 1);
          tooltip.style('opacity', '1').html(`Count: ${d}`);
        }
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip.style('left', `${event.clientX - rect.left + 10}px`).style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke', 'none');
        tooltip.style('opacity', '0');
      });

    g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6));
    g.append('g').call(d3.axisLeft(y).ticks(6));
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
