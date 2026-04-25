// @ts-nocheck
import { createDeckMap, toPoints, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const points = toPoints(data);
  if (!points.length) return renderEmpty(container, 'deckgl-screen-grid', 'Provide <code>{points: [{lng, lat, weight?}], cellSizePixels?}</code>.');

  const { center = [points[0].lng, points[0].lat], zoom = 4, style, pitch = 0, cellSizePixels = 40 } = data as any;

  const { ScreenGridLayer } = await import('@deck.gl/aggregation-layers');
  const layer = new ScreenGridLayer({
    id: 'screen-grid',
    data: points,
    getPosition: (d: any) => [d.lng, d.lat],
    getWeight: (d: any) => d.weight ?? 1,
    cellSizePixels,
    opacity: 0.8,
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
