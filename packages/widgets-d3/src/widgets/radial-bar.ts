// @ts-nocheck
// ---------------------------------------------------------------------------
// Radial bar chart widget — bars arranged in a circle
// ---------------------------------------------------------------------------

interface Bar {
  label: string;
  value: number;
  color?: string;
}

interface RadialBarData {
  bars: Bar[];
  title?: string;
  innerRadius?: number;
  colorScheme?: string;
}

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const {
    bars,
    title,
    innerRadius: innerRadiusRatio = 0.3,
    colorScheme,
  } = data as unknown as RadialBarData;

  const width = 500;
  const radius = width / 2;
  const innerRadius = radius * innerRadiusRatio;
  const outerRadius = radius - 40;

  const colors = d3.scaleOrdinal(
    (d3 as any)[`scheme${colorScheme ?? 'Tableau10'}`] ?? d3.schemeTableau10,
  );

  const maxVal = d3.max(bars, (d) => d.value) ?? 1;

  const x = d3
    .scaleBand()
    .domain(bars.map((d) => d.label))
    .range([0, 2 * Math.PI])
    .padding(0.1);

  const y = d3
    .scaleRadial()
    .domain([0, maxVal])
    .range([innerRadius, outerRadius]);

  const arcGen = d3
    .arc<any>()
    .innerRadius(innerRadius)
    .outerRadius((d: any) => y(d.value))
    .startAngle((d: any) => x(d.label)!)
    .endAngle((d: any) => x(d.label)! + x.bandwidth())
    .padAngle(0.01)
    .padRadius(innerRadius);

  const svg = d3
    .select(container)
    .append('svg')
    .attr('viewBox', `${-radius} ${-radius} ${width} ${width}`)
    .style('width', '100%')
    .style('height', 'auto')
    .style('font', '10px sans-serif');

  if (title) {
    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -radius + 16)
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

  // Bars
  const barPaths = svg
    .append('g')
    .selectAll('path')
    .data(bars)
    .join('path')
    .attr('fill', (d, i) => d.color ?? colors(String(i)))
    .attr('d', (d) => arcGen(d as any))
    .style('opacity', 0);

  barPaths
    .transition()
    .duration(500)
    .delay((_, i) => i * 30)
    .style('opacity', 0.85);

  barPaths
    .on('mouseenter', function (event: MouseEvent, d: Bar) {
      d3.select(this).style('opacity', 1);
      tooltip
        .style('opacity', '1')
        .html(`<strong>${d.label}</strong><br/>Value: ${d.value}`);
    })
    .on('mousemove', function (event: MouseEvent) {
      const rect = container.getBoundingClientRect();
      tooltip
        .style('left', `${event.clientX - rect.left + 10}px`)
        .style('top', `${event.clientY - rect.top - 10}px`);
    })
    .on('mouseleave', function () {
      d3.select(this).style('opacity', 0.85);
      tooltip.style('opacity', '0');
    });

  // Labels
  svg
    .append('g')
    .selectAll('g')
    .data(bars)
    .join('g')
    .attr('text-anchor', (d) => {
      const angle = x(d.label)! + x.bandwidth() / 2;
      return angle > Math.PI ? 'end' : 'start';
    })
    .attr('transform', (d) => {
      const angle = x(d.label)! + x.bandwidth() / 2;
      const r = y(d.value) + 6;
      return `rotate(${(angle * 180) / Math.PI - 90}) translate(${r},0)${angle > Math.PI ? ' rotate(180)' : ''}`;
    })
    .append('text')
    .style('font-size', '10px')
    .attr('dy', '0.35em')
    .text((d) => d.label);

  // Grid circles
  const ticks = y.ticks(4);
  svg
    .append('g')
    .selectAll('circle')
    .data(ticks)
    .join('circle')
    .attr('r', (d) => y(d))
    .attr('fill', 'none')
    .attr('stroke', '#ddd')
    .attr('stroke-dasharray', '2,3');

  // Tick labels
  svg
    .append('g')
    .selectAll('text')
    .data(ticks)
    .join('text')
    .attr('y', (d) => -y(d))
    .attr('dy', '-0.3em')
    .attr('text-anchor', 'middle')
    .style('font-size', '9px')
    .style('fill', '#999')
    .text((d) => String(d));

  return () => {
    tooltip.remove();
    svg.remove();
  };
}
