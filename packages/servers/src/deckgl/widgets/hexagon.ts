// @ts-nocheck
import { createDeckMap, toPoints, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const points = toPoints(data);
  if (!points.length) return renderEmpty(container, 'deckgl-hexagon', 'Provide <code>{points: [{lng, lat, weight?}], radius?: meters}</code>.');

  const { center = [points[0].lng, points[0].lat], zoom = 4, style, pitch = 40, radius = 1000, extruded = true, elevationScale = 20, coverage = 0.9, upperPercentile = 100 } = data as any;

  const { HexagonLayer } = await import('@deck.gl/aggregation-layers');
  const layer = new HexagonLayer({
    id: 'hexagon',
    data: points,
    getPosition: (d: any) => [d.lng, d.lat],
    getElevationWeight: (d: any) => d.weight ?? 1,
    getColorWeight: (d: any) => d.weight ?? 1,
    radius,
    coverage,
    extruded,
    elevationScale,
    upperPercentile,
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
