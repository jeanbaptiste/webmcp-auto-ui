// @ts-nocheck
import { loadD3 } from './_d3.js';
// ---------------------------------------------------------------------------
// Globe widget — orthographic projection with rotation
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await loadD3();
  const { geojson, points, title, colorScheme = 'Blues', rotate = [0, -20, 0] } = data as any;

  container.style.position = 'relative';

  const tooltip = d3.select(container).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', 'rgba(0,0,0,0.8)').style('color', '#fff')
    .style('padding', '4px 8px').style('border-radius', '4px')
    .style('font-size', '12px').style('opacity', '0');

  // Preserve rotation state across redraws
  let currentRotate = [...rotate];

  const draw = (width: number, height: number) => {
    d3.select(container).selectAll('svg').remove();

    // Use smaller dim for square globe
    const size = Math.min(width, height);
    const radius = size / 2 - 10;

    const proj = d3.geoOrthographic()
      .scale(radius)
      .translate([width / 2, height / 2])
      .rotate(currentRotate)
      .clipAngle(90);

    const pathGen = d3.geoPath().projection(proj);

    const svg = d3.select(container).append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%').style('height', '100%')
      .style('display', 'block')
      .style('font', '10px sans-serif');

    if (title) svg.append('text').attr('x', width / 2).attr('y', 20).attr('text-anchor', 'middle').style('font-size', '14px').style('font-weight', 'bold').text(title);

    // Ocean
    svg.append('circle')
      .attr('cx', width / 2).attr('cy', height / 2)
      .attr('r', radius)
      .attr('fill', '#e8f4fd')
      .attr('stroke', '#ccc');

    // Graticule
    const graticule = d3.geoGraticule();
    svg.append('path')
      .datum(graticule())
      .attr('d', pathGen)
      .attr('fill', 'none')
      .attr('stroke', '#ddd')
      .attr('stroke-width', 0.5);

    // Land
    const features = geojson?.features || [];
    svg.selectAll('path.land')
      .data(features)
      .join('path')
      .attr('class', 'land')
      .attr('d', pathGen)
      .attr('fill', '#a8d8a8')
      .attr('stroke', '#666')
      .attr('stroke-width', 0.3)
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('fill', '#7bc47b');
        tooltip.style('opacity', '1').html(`<strong>${d.properties?.name ?? 'Region'}</strong>`);
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip.style('left', `${event.clientX - rect.left + 10}px`).style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('fill', '#a8d8a8');
        tooltip.style('opacity', '0');
      });

    // Points
    if (points && points.length) {
      const colors = d3.scaleOrdinal(
        (d3 as any)[`scheme${colorScheme}`] ?? d3.schemeTableau10,
      );

      svg.selectAll('circle.point')
        .data(points)
        .join('circle')
        .attr('class', 'point')
        .attr('cx', (d) => proj([d.lon, d.lat])?.[0] ?? -999)
        .attr('cy', (d) => proj([d.lon, d.lat])?.[1] ?? -999)
        .attr('r', (d) => d.radius ?? 5)
        .attr('fill', (_, i) => colors(String(i)))
        .attr('fill-opacity', 0.8)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('display', (d) => {
          const coords = proj([d.lon, d.lat]);
          // Check if point is on visible side
          const dist = d3.geoDistance([d.lon, d.lat], proj.invert([width / 2, height / 2]));
          return dist > Math.PI / 2 ? 'none' : null;
        })
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('r', (d.radius ?? 5) + 3);
          tooltip.style('opacity', '1').html(`<strong>${d.label ?? `(${d.lat}, ${d.lon})`}</strong>${d.value != null ? `<br/>Value: ${d.value}` : ''}`);
        })
        .on('mousemove', function (event) {
          const rect = container.getBoundingClientRect();
          tooltip.style('left', `${event.clientX - rect.left + 10}px`).style('top', `${event.clientY - rect.top - 10}px`);
        })
        .on('mouseleave', function (_, d) {
          d3.select(this).attr('r', d.radius ?? 5);
          tooltip.style('opacity', '0');
        });
    }

    // Drag to rotate
    svg.call(
      d3.drag()
        .on('drag', (event) => {
          currentRotate[0] += event.dx * 0.5;
          currentRotate[1] -= event.dy * 0.5;
          proj.rotate(currentRotate);
          svg.selectAll('path.land').attr('d', pathGen);
          svg.select('path').attr('d', pathGen); // graticule
          if (points && points.length) {
            svg.selectAll('circle.point')
              .attr('cx', (d) => proj([d.lon, d.lat])?.[0] ?? -999)
              .attr('cy', (d) => proj([d.lon, d.lat])?.[1] ?? -999)
              .attr('display', (d) => {
                const dist = d3.geoDistance([d.lon, d.lat], proj.invert([width / 2, height / 2]));
                return dist > Math.PI / 2 ? 'none' : null;
              });
          }
        }),
    );
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
