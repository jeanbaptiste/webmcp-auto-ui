// @ts-nocheck
// ---------------------------------------------------------------------------
// Chord diagram widget — flows between groups in a circular layout
// ---------------------------------------------------------------------------

interface ChordData {
  labels: string[];
  matrix: number[][];
  title?: string;
  colorScheme?: string;
}

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { labels, matrix, title, colorScheme } = data as unknown as ChordData;

  const width = 500;
  const radius = width / 2;
  const innerRadius = radius - 80;
  const outerRadius = radius - 40;

  const colors = d3.scaleOrdinal(
    (d3 as any)[`scheme${colorScheme ?? 'Tableau10'}`] ?? d3.schemeTableau10,
  );

  const chord = d3
    .chord()
    .padAngle(0.05)
    .sortSubgroups(d3.descending);

  const chords = chord(matrix);

  const arcGen = d3.arc<d3.ChordGroup>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

  const ribbon = d3.ribbon<any, d3.Chord>().radius(innerRadius);

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

  // Groups (arcs)
  const group = svg
    .append('g')
    .selectAll('g')
    .data(chords.groups)
    .join('g');

  group
    .append('path')
    .attr('fill', (d) => colors(labels[d.index]))
    .attr('stroke', '#fff')
    .attr('d', arcGen as any)
    .style('opacity', 0)
    .transition()
    .duration(500)
    .style('opacity', 1);

  group
    .append('text')
    .each((d: any) => {
      d.angle = (d.startAngle + d.endAngle) / 2;
    })
    .attr('dy', '0.35em')
    .attr('transform', (d: any) =>
      `rotate(${(d.angle * 180) / Math.PI - 90}) translate(${outerRadius + 8})${d.angle > Math.PI ? ' rotate(180)' : ''}`,
    )
    .attr('text-anchor', (d: any) => (d.angle > Math.PI ? 'end' : null))
    .style('font-size', '11px')
    .text((d) => labels[d.index]);

  // Ribbons
  const ribbons = svg
    .append('g')
    .attr('fill-opacity', 0.6)
    .selectAll('path')
    .data(chords)
    .join('path')
    .attr('fill', (d) => colors(labels[d.source.index]))
    .attr('d', ribbon as any)
    .style('opacity', 0);

  ribbons
    .transition()
    .duration(600)
    .delay((_, i) => i * 30)
    .style('opacity', 1);

  ribbons
    .on('mouseenter', function (event: MouseEvent, d) {
      d3.select(this).attr('fill-opacity', 0.9);
      tooltip
        .style('opacity', '1')
        .html(
          `<strong>${labels[d.source.index]}</strong> → <strong>${labels[d.target.index]}</strong><br/>Value: ${d.source.value}`,
        );
    })
    .on('mousemove', function (event: MouseEvent) {
      const rect = container.getBoundingClientRect();
      tooltip
        .style('left', `${event.clientX - rect.left + 10}px`)
        .style('top', `${event.clientY - rect.top - 10}px`);
    })
    .on('mouseleave', function () {
      d3.select(this).attr('fill-opacity', 0.6);
      tooltip.style('opacity', '0');
    });

  return () => {
    tooltip.remove();
    svg.remove();
  };
}
