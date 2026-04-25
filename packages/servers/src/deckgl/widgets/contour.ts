// @ts-nocheck
import { createDeckMap, toPoints, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const points = toPoints(data);
  if (!points.length) return renderEmpty(container, 'deckgl-contour', 'Provide <code>{points: [{lng, lat, weight?}], contours?: [...], cellSize?}</code>.');

  const { center = [points[0].lng, points[0].lat], zoom = 4, style, pitch = 0, cellSize = 200 } = data as any;
  const contours = (data as any).contours ?? [
    { threshold: 1, color: [255, 0, 0], strokeWidth: 2 },
    { threshold: 5, color: [0, 255, 0], strokeWidth: 2 },
    { threshold: 10, color: [0, 0, 255], strokeWidth: 2 },
  ];

  const { ContourLayer } = await import('@deck.gl/aggregation-layers');
  const layer = new ContourLayer({
    id: 'contour',
    data: points,
    getPosition: (d: any) => [d.lng, d.lat],
    getWeight: (d: any) => d.weight ?? 1,
    cellSize,
    contours,
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
