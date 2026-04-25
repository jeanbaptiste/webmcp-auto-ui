// @ts-nocheck
import { loadD3 } from './_d3.js';
// ---------------------------------------------------------------------------
// Pie chart widget — proportional slices in a circle
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await loadD3();
  const { slices, title, colorScheme } = data as any;

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

    const radius = Math.min(width, height) / 2 - 40;

    const pie = d3.pie().value((d) => d.value).sort(null);
    const arcGen = d3.arc().innerRadius(0).outerRadius(radius);
    const labelArc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius * 0.6);

    const pieData = pie(slices);

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
        .attr('y', 24)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text(title);
    }

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const paths = g
      .selectAll('path')
      .data(pieData)
      .join('path')
      .attr('fill', (d, i) => d.data.color ?? colors(String(i)))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('d', arcGen)
      .style('opacity', 0);

    paths.transition().duration(500).delay((_, i) => i * 50).style('opacity', 1);

    // Labels
    g.selectAll('text')
      .data(pieData.filter((d) => d.endAngle - d.startAngle > 0.2))
      .join('text')
      .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .text((d) => d.data.label);

    paths
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('transform', 'scale(1.05)');
        const total = d3.sum(slices, (s) => s.value);
        const pct = ((d.data.value / total) * 100).toFixed(1);
        tooltip
          .style('opacity', '1')
          .html(`<strong>${d.data.label}</strong><br/>Value: ${d.data.value} (${pct}%)`);
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip
          .style('left', `${event.clientX - rect.left + 10}px`)
          .style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1).attr('transform', 'scale(1)');
        tooltip.style('opacity', '0');
      });
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
