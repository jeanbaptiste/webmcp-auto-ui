// @ts-nocheck
import { loadD3 } from './_d3.js';
// ---------------------------------------------------------------------------
// Projection map widget — flat map with configurable projection
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await loadD3();
  const { geojson, title, projection: projName = 'geoNaturalEarth1', colorScheme = 'Greens', values } = data as any;

  container.style.position = 'relative';

  const valueMap = new Map();
  (values || []).forEach((v) => valueMap.set(v.id, v.value));
  const valExtent = d3.extent(values || [], (v) => v.value);

  const colorScale = d3.scaleSequential(
    (d3 as any)[`interpolate${colorScheme}`] ?? d3.interpolateGreens,
  ).domain(valExtent[0] != null ? valExtent : [0, 1]);

  const tooltip = d3.select(container).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', 'rgba(0,0,0,0.8)').style('color', '#fff')
    .style('padding', '4px 8px').style('border-radius', '4px')
    .style('font-size', '12px').style('opacity', '0');

  const draw = (width: number, height: number) => {
    d3.select(container).selectAll('svg').remove();

    const projFn = d3[projName] ?? d3.geoNaturalEarth1;
    const proj = projFn().fitSize([width - 20, height - (title ? 40 : 20)], geojson);
    const pathGen = d3.geoPath().projection(proj);

    const svg = d3.select(container).append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%').style('height', '100%')
      .style('display', 'block')
      .style('font', '10px sans-serif');

    if (title) svg.append('text').attr('x', width / 2).attr('y', 20).attr('text-anchor', 'middle').style('font-size', '14px').style('font-weight', 'bold').text(title);

    // Graticule
    const graticule = d3.geoGraticule();
    svg.append('path')
      .datum(graticule())
      .attr('d', pathGen)
      .attr('fill', 'none')
      .attr('stroke', '#eee')
      .attr('stroke-width', 0.5);

    // Outline
    svg.append('path')
      .datum({ type: 'Sphere' })
      .attr('d', pathGen)
      .attr('fill', 'none')
      .attr('stroke', '#ccc');

    const features = geojson.features || [];
    const g = svg.append('g').attr('transform', title ? 'translate(10,30)' : 'translate(10,10)');

    g.selectAll('path')
      .data(features)
      .join('path')
      .attr('d', pathGen)
      .attr('fill', (d) => {
        const id = d.properties?.id ?? d.properties?.name ?? d.id;
        const val = valueMap.get(id);
        return val != null ? colorScale(val) : '#ddd';
      })
      .attr('stroke', '#999')
      .attr('stroke-width', 0.4)
      .style('opacity', 0)
      .transition().duration(500)
      .style('opacity', 1);

    g.selectAll('path')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('stroke', '#333').attr('stroke-width', 1.5);
        const id = d.properties?.id ?? d.properties?.name ?? d.id;
        const val = valueMap.get(id);
        tooltip.style('opacity', '1').html(`<strong>${d.properties?.name ?? id}</strong>${val != null ? `<br/>Value: ${val}` : ''}`);
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip.style('left', `${event.clientX - rect.left + 10}px`).style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke', '#999').attr('stroke-width', 0.4);
        tooltip.style('opacity', '0');
      });
  };

  const getSize = (): [number, number] => [
    container.clientWidth || 700,
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
