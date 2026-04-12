// @ts-nocheck
// ---------------------------------------------------------------------------
// Treemap widget — hierarchical data as nested rectangles
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { root: rawRoot, title, colorScheme, tile = 'squarify' } = data as any;

  const width = 500;
  const height = 400;
  const margin = { top: title ? 32 : 8, right: 4, bottom: 4, left: 4 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const colors = d3.scaleOrdinal(
    (d3 as any)[`scheme${colorScheme ?? 'Tableau10'}`] ?? d3.schemeTableau10,
  );

  const tileMethod: Record<string, any> = {
    squarify: d3.treemapSquarify,
    binary: d3.treemapBinary,
    dice: d3.treemapDice,
    slice: d3.treemapSlice,
    sliceDice: d3.treemapSliceDice,
  };

  const hierarchy = d3
    .hierarchy(rawRoot)
    .sum((d: any) => d.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const treemap = d3
    .treemap()
    .size([innerW, innerH])
    .tile(tileMethod[tile] ?? d3.treemapSquarify)
    .padding(2)
    .round(true);

  const root = treemap(hierarchy);

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
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const leaves = root.leaves();

  const cell = g
    .selectAll('g')
    .data(leaves)
    .join('g')
    .attr('transform', (d) => `translate(${d.x0},${d.y0})`);

  cell
    .append('rect')
    .attr('width', (d) => d.x1 - d.x0)
    .attr('height', (d) => d.y1 - d.y0)
    .attr('fill', (d) => {
      let node = d;
      while (node.depth > 1) node = node.parent;
      return colors(node.data.name);
    })
    .attr('fill-opacity', 0.85)
    .attr('rx', 2)
    .style('opacity', 0)
    .transition()
    .duration(500)
    .delay((_, i) => i * 15)
    .style('opacity', 1);

  cell
    .append('text')
    .attr('x', 4)
    .attr('y', 14)
    .style('font-size', '10px')
    .style('fill', '#fff')
    .style('pointer-events', 'none')
    .text((d) => {
      const w = d.x1 - d.x0;
      const h = d.y1 - d.y0;
      return w > 40 && h > 18 ? d.data.name : '';
    });

  cell
    .append('text')
    .attr('x', 4)
    .attr('y', 26)
    .style('font-size', '9px')
    .style('fill', 'rgba(255,255,255,0.7)')
    .style('pointer-events', 'none')
    .text((d) => {
      const w = d.x1 - d.x0;
      const h = d.y1 - d.y0;
      return w > 40 && h > 30 ? String(d.value) : '';
    });

  cell
    .on('mouseenter', function (event, d) {
      d3.select(this).select('rect').attr('fill-opacity', 1);
      const path = d.ancestors().reverse().map((a) => a.data.name).join(' / ');
      tooltip.style('opacity', '1').html(`<strong>${path}</strong><br/>Value: ${d.value}`);
    })
    .on('mousemove', function (event) {
      const rect = container.getBoundingClientRect();
      tooltip
        .style('left', `${event.clientX - rect.left + 10}px`)
        .style('top', `${event.clientY - rect.top - 10}px`);
    })
    .on('mouseleave', function () {
      d3.select(this).select('rect').attr('fill-opacity', 0.85);
      tooltip.style('opacity', '0');
    });

  return () => {
    tooltip.remove();
    svg.remove();
  };
}
