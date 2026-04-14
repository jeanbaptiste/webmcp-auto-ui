// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 11, points = [], radius = 5, color = '#e74c3c', opacity = 0.7 } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  // Create SVG overlay using Leaflet's built-in SVG renderer
  const svg = L.svg();
  svg.addTo(map);

  const d3 = await import('d3');
  const svgEl = d3.select(container).select('svg.leaflet-zoom-animated');
  const g = svgEl.append('g');

  function update() {
    const dots = g.selectAll('circle').data(points);
    dots.enter()
      .append('circle')
      .merge(dots as any)
      .attr('cx', (d: any) => map.latLngToLayerPoint(L.latLng(d[0], d[1])).x)
      .attr('cy', (d: any) => map.latLngToLayerPoint(L.latLng(d[0], d[1])).y)
      .attr('r', radius)
      .attr('fill', color)
      .attr('fill-opacity', opacity)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5);
    dots.exit().remove();
  }

  map.on('moveend', update);
  map.on('zoomend', update);
  update();

  return () => { map.remove(); };
}
