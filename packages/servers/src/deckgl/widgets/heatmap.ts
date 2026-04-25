// @ts-nocheck
import { createDeckMap, toPoints, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const points = toPoints(data);
  if (!points.length) return renderEmpty(container, 'deckgl-heatmap', 'Provide <code>{points: [{lng, lat, weight?}]}</code>.');

  const { center = [points[0].lng, points[0].lat], zoom = 4, style, pitch = 0, radiusPixels = 40, intensity = 1, threshold = 0.05 } = data as any;

  const { HeatmapLayer } = await import('@deck.gl/aggregation-layers');
  const layer = new HeatmapLayer({
    id: 'heatmap',
    data: points,
    getPosition: (d: any) => [d.lng, d.lat],
    getWeight: (d: any) => d.weight ?? 1,
    radiusPixels,
    intensity,
    threshold,
    aggregation: 'SUM',
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
