// @ts-nocheck
import { createDeckMap, toPoints, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const points = toPoints(data);
  if (!points.length) return renderEmpty(container, 'deckgl-grid', 'Provide <code>{points: [{lng, lat, weight?}], cellSize?: meters}</code>.');

  const { center = [points[0].lng, points[0].lat], zoom = 4, style, pitch = 40, cellSize = 1000, extruded = true, elevationScale = 20 } = data as any;

  const { GridLayer } = await import('@deck.gl/aggregation-layers');
  const layer = new GridLayer({
    id: 'grid',
    data: points,
    getPosition: (d: any) => [d.lng, d.lat],
    getElevationWeight: (d: any) => d.weight ?? 1,
    getColorWeight: (d: any) => d.weight ?? 1,
    cellSize,
    extruded,
    elevationScale,
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
