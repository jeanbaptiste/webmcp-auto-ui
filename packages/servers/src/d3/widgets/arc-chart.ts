// @ts-nocheck
// ---------------------------------------------------------------------------
// Arc chart widget — gauge/progress arcs
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { arcs, title, colorScheme } = data as any;

  const width = 500;
  const height = 300;
  const radius = Math.min(width, height * 2) / 2 - 20;

  const colors = d3.scaleOrdinal(
    (d3 as any)[`scheme${colorScheme ?? 'Tableau10'}`] ?? d3.schemeTableau10,
  );

  const svg = d3
    .select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('width', '100%')
    .style('height', 'auto')
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

  const g = svg
    .append('g')
    .attr('transform', `translate(${width / 2},${height - 20})`);

  const arcData = (arcs || []).map((a, i) => ({
    label: a.label || `Arc ${i + 1}`,
    value: Math.min(1, Math.max(0, a.value ?? 0)),
    max: a.max ?? 1,
    color: a.color,
  }));

  const bandWidth = radius / (arcData.length + 1);

  arcData.forEach((item, i) => {
    const inner = bandWidth * (i + 0.5);
    const outer = bandWidth * (i + 1.3);
    const ratio = item.value / item.max;

    // Background arc
    const bgArc = d3.arc()
      .innerRadius(inner)
      .outerRadius(outer)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2)
      .cornerRadius(3);

    g.append('path')
      .attr('d', bgArc())
      .attr('fill', '#eee');

    // Value arc
    const valArc = d3.arc()
      .innerRadius(inner)
      .outerRadius(outer)
      .startAngle(-Math.PI / 2)
      .endAngle(-Math.PI / 2 + Math.PI * ratio)
      .cornerRadius(3);

    g.append('path')
      .attr('d', valArc())
      .attr('fill', item.color ?? colors(String(i)))
      .attr('fill-opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event) {
        d3.select(this).attr('fill-opacity', 1);
        tooltip
          .style('opacity', '1')
          .html(`<strong>${item.label}</strong><br/>${(ratio * 100).toFixed(1)}%`);
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip
          .style('left', `${event.clientX - rect.left + 10}px`)
          .style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill-opacity', 0.85);
        tooltip.style('opacity', '0');
      });

    // Label
    g.append('text')
      .attr('x', outer + 4)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .text(`${item.label} (${(ratio * 100).toFixed(0)}%)`);
  });

  return () => {
    tooltip.remove();
    svg.remove();
  };
}
