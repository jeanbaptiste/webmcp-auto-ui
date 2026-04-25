// @ts-nocheck
import { loadD3 } from './_d3.js';
// ---------------------------------------------------------------------------
// Circle packing widget — hierarchical data as nested circles
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await loadD3();
  const { root: rawRoot, title, colorScheme, showLabels = true } = data as any;

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

    const hierarchy = d3
      .hierarchy(rawRoot)
      .sum((d: any) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const pack = d3
      .pack()
      .size([width - 4, height - (title ? 36 : 4)])
      .padding(3);

    const root = pack(hierarchy);

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
      .attr('transform', title ? 'translate(2, 32)' : 'translate(2, 2)');

    const descendants = root.descendants();

    const circles = g
      .selectAll('circle')
      .data(descendants)
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', 0)
      .attr('fill', (d) => {
        if (!d.children) {
          let node = d;
          while (node.depth > 1) node = node.parent;
          return colors(node.data.name);
        }
        return d.depth === 0 ? '#f8f8f8' : 'rgba(255,255,255,0.5)';
      })
      .attr('fill-opacity', (d) => (d.children ? 0.3 : 0.8))
      .attr('stroke', (d) => (d.children ? '#bbb' : 'none'))
      .attr('stroke-width', 1)
      .style('cursor', 'pointer');

    circles
      .transition()
      .duration(600)
      .delay((d) => d.depth * 100)
      .attr('r', (d) => d.r);

    if (showLabels) {
      g.selectAll('text')
        .data(descendants.filter((d) => !d.children && d.r > 14))
        .join('text')
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('font-size', (d) => `${Math.min(d.r / 3, 12)}px`)
        .style('pointer-events', 'none')
        .text((d) => d.data.name);
    }

    circles
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);
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
        d3.select(this)
          .attr('stroke', d.children ? '#bbb' : 'none')
          .attr('stroke-width', 1);
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
