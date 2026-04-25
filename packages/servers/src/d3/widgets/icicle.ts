// @ts-nocheck
import { loadD3 } from './_d3.js';
// ---------------------------------------------------------------------------
// Icicle widget — hierarchical data as stacked horizontal bars
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await loadD3();
  const { root: rawRoot, title, colorScheme, orientation = 'vertical' } = data as any;

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

    const margin = { top: title ? 32 : 8, right: 4, bottom: 4, left: 4 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const hierarchy = d3
      .hierarchy(rawRoot)
      .sum((d: any) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const partition = d3.partition().size(
      orientation === 'horizontal' ? [innerH, innerW] : [innerW, innerH],
    );

    const root = partition(hierarchy);

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

    const descendants = root.descendants();

    const cell = g
      .selectAll('rect')
      .data(descendants)
      .join('rect')
      .attr('x', (d) => (orientation === 'horizontal' ? d.y0 : d.x0))
      .attr('y', (d) => (orientation === 'horizontal' ? d.x0 : d.y0))
      .attr('width', (d) => (orientation === 'horizontal' ? d.y1 - d.y0 : d.x1 - d.x0))
      .attr('height', (d) => (orientation === 'horizontal' ? d.x1 - d.x0 : d.y1 - d.y0))
      .attr('fill', (d) => {
        let node = d;
        while (node.depth > 1) node = node.parent;
        return colors(node.data.name);
      })
      .attr('fill-opacity', (d) => 1 - d.depth * 0.12)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .style('opacity', 0);

    cell.transition().duration(500).delay((_, i) => i * 20).style('opacity', 1);

    // Labels
    g.selectAll('text.label')
      .data(descendants.filter((d) => {
        const w = orientation === 'horizontal' ? d.y1 - d.y0 : d.x1 - d.x0;
        const h = orientation === 'horizontal' ? d.x1 - d.x0 : d.y1 - d.y0;
        return w > 40 && h > 14;
      }))
      .join('text')
      .attr('class', 'label')
      .attr('x', (d) => (orientation === 'horizontal' ? d.y0 + 4 : d.x0 + 4))
      .attr('y', (d) => (orientation === 'horizontal' ? (d.x0 + d.x1) / 2 : d.y0 + 12))
      .attr('dy', orientation === 'horizontal' ? '0.35em' : '0')
      .style('font-size', '10px')
      .style('fill', '#fff')
      .style('text-shadow', '1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000')
      .style('pointer-events', 'none')
      .text((d) => d.data.name);

    cell
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('fill-opacity', 1);
        const path = d.ancestors().reverse().map((a) => a.data.name).join(' / ');
        tooltip.style('opacity', '1').html(`<strong>${path}</strong><br/>Value: ${d.value}`);
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip
          .style('left', `${event.clientX - rect.left + 10}px`)
          .style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).attr('fill-opacity', 1 - d.depth * 0.12);
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
