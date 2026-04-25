// @ts-nocheck
import { loadD3 } from './_d3.js';
// ---------------------------------------------------------------------------
// Stacked area chart widget — multiple series stacked on top of each other
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await loadD3();
  const { series, title, xLabel, yLabel, colorScheme } = data as any;

  container.style.position = 'relative';

  const colors = d3.scaleOrdinal(
    (d3 as any)[`scheme${colorScheme ?? 'Tableau10'}`] ?? d3.schemeTableau10,
  );

  const tooltip = d3.select(container).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', 'rgba(0,0,0,0.8)').style('color', '#fff')
    .style('padding', '4px 8px').style('border-radius', '4px')
    .style('font-size', '12px').style('opacity', '0');

  const draw = (width: number, height: number) => {
    d3.select(container).selectAll('svg').remove();

    const margin = { top: title ? 36 : 16, right: 20, bottom: 40, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    // Transform series [{label, points: [{x, y}]}] to stackable format
    const keys = series.map((s) => s.label || `s${series.indexOf(s)}`);
    const xValues = series[0].points.map((p) => p.x);
    const tableData = xValues.map((xv, idx) => {
      const row = { x: xv };
      series.forEach((s, si) => {
        row[keys[si]] = s.points[idx]?.y ?? 0;
      });
      return row;
    });

    const stack = d3.stack().keys(keys);
    const stacked = stack(tableData);

    const x = d3.scaleLinear().domain(d3.extent(xValues)).nice().range([0, innerW]);
    const y = d3.scaleLinear()
      .domain([0, d3.max(stacked[stacked.length - 1], (d) => d[1])])
      .nice()
      .range([innerH, 0]);

    const areaGen = d3.area()
      .x((d) => x(d.data.x))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveMonotoneX);

    const svg = d3.select(container).append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%').style('height', '100%')
      .style('display', 'block')
      .style('font', '10px sans-serif');

    if (title) svg.append('text').attr('x', width / 2).attr('y', 20).attr('text-anchor', 'middle').style('font-size', '14px').style('font-weight', 'bold').text(title);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(8));
    g.append('g').call(d3.axisLeft(y).ticks(6));

    if (xLabel) g.append('text').attr('x', innerW / 2).attr('y', innerH + 34).attr('text-anchor', 'middle').style('font-size', '11px').text(xLabel);
    if (yLabel) g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -38).attr('text-anchor', 'middle').style('font-size', '11px').text(yLabel);

    const layers = g.selectAll('path.layer')
      .data(stacked)
      .join('path')
      .attr('class', 'layer')
      .attr('fill', (d, i) => colors(String(i)))
      .attr('fill-opacity', 0.75)
      .attr('d', areaGen)
      .style('opacity', 0);

    layers.transition().duration(600).delay((_, i) => i * 80).style('opacity', 1);

    layers
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('fill-opacity', 1);
        tooltip.style('opacity', '1').html(`<strong>${d.key}</strong>`);
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip.style('left', `${event.clientX - rect.left + 10}px`).style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill-opacity', 0.75);
        tooltip.style('opacity', '0');
      });

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${margin.left + 10},${margin.top})`);
    keys.forEach((k, i) => {
      const row = legend.append('g').attr('transform', `translate(0,${i * 16})`);
      row.append('rect').attr('width', 12).attr('height', 12).attr('fill', colors(String(i)));
      row.append('text').attr('x', 16).attr('y', 10).style('font-size', '10px').text(k);
    });
  };

  const getSize = (): [number, number] => [
    container.clientWidth || 560,
    container.clientHeight || 360,
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
