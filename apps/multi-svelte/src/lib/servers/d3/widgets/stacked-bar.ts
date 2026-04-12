// @ts-nocheck
// ---------------------------------------------------------------------------
// Stacked bar chart widget — grouped categories with stacked values
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await import('d3');
  const { categories, series, title, xLabel, yLabel, colorScheme, horizontal = false } = data as any;

  const width = 560;
  const height = 360;
  const margin = { top: title ? 36 : 16, right: 20, bottom: 50, left: 50 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const colors = d3.scaleOrdinal(
    (d3 as any)[`scheme${colorScheme ?? 'Tableau10'}`] ?? d3.schemeTableau10,
  );

  const keys = series.map((s) => s.label);
  const tableData = categories.map((cat, idx) => {
    const row = { category: cat };
    series.forEach((s) => { row[s.label] = s.values[idx] ?? 0; });
    return row;
  });

  const stack = d3.stack().keys(keys);
  const stacked = stack(tableData);

  const maxVal = d3.max(stacked[stacked.length - 1], (d) => d[1]);

  let x, y, xAxis, yAxis;
  if (horizontal) {
    y = d3.scaleBand().domain(categories).range([0, innerH]).padding(0.2);
    x = d3.scaleLinear().domain([0, maxVal]).nice().range([0, innerW]);
    xAxis = d3.axisBottom(x).ticks(6);
    yAxis = d3.axisLeft(y);
  } else {
    x = d3.scaleBand().domain(categories).range([0, innerW]).padding(0.2);
    y = d3.scaleLinear().domain([0, maxVal]).nice().range([innerH, 0]);
    xAxis = d3.axisBottom(x);
    yAxis = d3.axisLeft(y).ticks(6);
  }

  const svg = d3.select(container).append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('width', '100%').style('height', 'auto')
    .style('font', '10px sans-serif');

  if (title) svg.append('text').attr('x', width / 2).attr('y', 20).attr('text-anchor', 'middle').style('font-size', '14px').style('font-weight', 'bold').text(title);

  const tooltip = d3.select(container).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', 'rgba(0,0,0,0.8)').style('color', '#fff')
    .style('padding', '4px 8px').style('border-radius', '4px')
    .style('font-size', '12px').style('opacity', '0');

  container.style.position = 'relative';

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis)
    .selectAll('text').style('text-anchor', 'end').attr('transform', 'rotate(-25)');
  g.append('g').call(yAxis);

  // Bars
  const layers = g.selectAll('g.layer')
    .data(stacked)
    .join('g')
    .attr('class', 'layer')
    .attr('fill', (d, i) => colors(String(i)));

  if (horizontal) {
    layers.selectAll('rect')
      .data((d) => d)
      .join('rect')
      .attr('y', (d) => y(d.data.category))
      .attr('x', (d) => x(d[0]))
      .attr('width', (d) => x(d[1]) - x(d[0]))
      .attr('height', y.bandwidth())
      .attr('rx', 2)
      .style('opacity', 0)
      .transition().duration(500).delay((_, i) => i * 30)
      .style('opacity', 1);
  } else {
    layers.selectAll('rect')
      .data((d) => d)
      .join('rect')
      .attr('x', (d) => x(d.data.category))
      .attr('y', (d) => y(d[1]))
      .attr('height', (d) => y(d[0]) - y(d[1]))
      .attr('width', x.bandwidth())
      .attr('rx', 2)
      .style('opacity', 0)
      .transition().duration(500).delay((_, i) => i * 30)
      .style('opacity', 1);
  }

  layers.selectAll('rect')
    .on('mouseenter', function (event, d) {
      d3.select(this).attr('fill-opacity', 1).attr('stroke', '#333').attr('stroke-width', 1);
      const key = d3.select(this.parentNode).datum().key;
      const val = d[1] - d[0];
      tooltip.style('opacity', '1').html(`<strong>${d.data.category}</strong><br/>${key}: ${val}`);
    })
    .on('mousemove', function (event) {
      const rect = container.getBoundingClientRect();
      tooltip.style('left', `${event.clientX - rect.left + 10}px`).style('top', `${event.clientY - rect.top - 10}px`);
    })
    .on('mouseleave', function () {
      d3.select(this).attr('fill-opacity', null).attr('stroke', 'none');
      tooltip.style('opacity', '0');
    });

  // Legend
  const legend = svg.append('g').attr('transform', `translate(${width - margin.right - 80},${margin.top})`);
  keys.forEach((k, i) => {
    const row = legend.append('g').attr('transform', `translate(0,${i * 16})`);
    row.append('rect').attr('width', 12).attr('height', 12).attr('fill', colors(String(i)));
    row.append('text').attr('x', 16).attr('y', 10).style('font-size', '10px').text(k);
  });

  return () => {
    tooltip.remove();
    svg.remove();
  };
}
