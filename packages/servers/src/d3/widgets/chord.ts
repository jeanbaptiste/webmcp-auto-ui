// @ts-nocheck
// ---------------------------------------------------------------------------
// Chord diagram widget — flows between groups in a circular layout
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { labels, matrix, title, colorScheme } = data as any;

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

    // Chord is square-based; use the smaller dim for radius
    const size = Math.min(width, height);
    const radius = size / 2;
    const innerRadius = radius - 80;
    const outerRadius = radius - 40;

    // Truncate labels so they fit within (radius - outerRadius - 8) px outside the arc.
    const labelBudgetPx = Math.max(20, radius - outerRadius - 8);
    const maxChars = Math.max(6, Math.floor(labelBudgetPx / 6));
    const truncate = (text: string): string =>
      text.length > maxChars ? text.slice(0, Math.max(1, maxChars - 1)) + '…' : text;

    const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);
    const chords = chord(matrix);

    const arcGen = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    const ribbon = d3.ribbon().radius(innerRadius);

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `${-radius} ${-radius} ${size} ${size}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'block')
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

    const group = svg.append('g').selectAll('g').data(chords.groups).join('g');

    group
      .append('path')
      .attr('fill', (d) => colors(labels[d.index]))
      .attr('stroke', '#fff')
      .attr('d', arcGen)
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);

    group
      .append('text')
      .each((d) => { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr('dy', '0.35em')
      .attr('transform', (d) =>
        `rotate(${(d.angle * 180) / Math.PI - 90}) translate(${outerRadius + 8})${d.angle > Math.PI ? ' rotate(180)' : ''}`,
      )
      .attr('text-anchor', (d) => (d.angle > Math.PI ? 'end' : null))
      .style('font-size', '11px')
      .text((d) => truncate(String(labels[d.index] ?? '')))
      .append('title')
      .text((d) => String(labels[d.index] ?? ''));

    const ribbons = svg
      .append('g')
      .attr('fill-opacity', 0.6)
      .selectAll('path')
      .data(chords)
      .join('path')
      .attr('fill', (d) => colors(labels[d.source.index]))
      .attr('d', ribbon)
      .style('opacity', 0);

    ribbons.transition().duration(600).delay((_, i) => i * 30).style('opacity', 1);

    ribbons
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('fill-opacity', 0.9);
        tooltip
          .style('opacity', '1')
          .html(`<strong>${labels[d.source.index]}</strong> → <strong>${labels[d.target.index]}</strong><br/>Value: ${d.source.value}`);
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip
          .style('left', `${event.clientX - rect.left + 10}px`)
          .style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill-opacity', 0.6);
        tooltip.style('opacity', '0');
      });
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
