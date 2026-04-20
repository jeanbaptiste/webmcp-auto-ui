// @ts-nocheck
// ---------------------------------------------------------------------------
// Sunburst widget — hierarchical data as nested rings
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { root: rawRoot, title, colorScheme } = data as any;

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

  const draw = (width: number, height: number) => {
    d3.select(container).selectAll('svg').remove();

    const size = Math.min(width, height);
    const radius = size / 2;

    const hierarchy = d3
      .hierarchy(rawRoot)
      .sum((d: any) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const partition = d3.partition().size([2 * Math.PI, radius]);
    const root = partition(hierarchy);

    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1 - 1);

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
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', 16)
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text(title);
    }

    const rootGroup = svg
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const cells = rootGroup
      .selectAll('path')
      .data(root.descendants().filter((d) => d.depth > 0))
      .join('path')
      .attr('fill', (d) => {
        let node = d;
        while (node.depth > 1) node = node.parent;
        return colors(node.data.name);
      })
      .attr('fill-opacity', (d) => 1 - d.depth * 0.15)
      .attr('d', arc)
      .style('cursor', 'pointer')
      .style('opacity', 0);

    cells.transition().duration(600).delay((_, i) => i * 20).style('opacity', 1);

    cells
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('fill-opacity', 1);
        tooltip.style('opacity', '1').html(`<strong>${d.data.name}</strong><br/>Value: ${d.value}`);
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip
          .style('left', `${event.clientX - rect.left + 10}px`)
          .style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).attr('fill-opacity', 1 - d.depth * 0.15);
        tooltip.style('opacity', '0');
      });

    rootGroup
      .selectAll('text.label')
      .data(root.descendants().filter((d) => d.depth > 0 && d.x1 - d.x0 > 0.1))
      .join('text')
      .attr('class', 'label')
      .attr('transform', (d) => {
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .text((d) => d.data.name);
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
