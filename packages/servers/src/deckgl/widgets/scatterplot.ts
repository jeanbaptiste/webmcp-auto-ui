// @ts-nocheck
import { createDeckMap, toPoints, toRGBA, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const points = toPoints(data);
  if (!points.length) return renderEmpty(container, 'deckgl-scatterplot', 'Provide <code>{points: [{lng, lat, radius?, color?}]}</code>.');

  const { center, zoom = 3, style, pitch = 0, bearing = 0, radiusScale = 1, fillColor } = data as any;
  const first = points[0];
  const resolvedCenter = center ?? [first.lng, first.lat];
  const fallbackColor = toRGBA(fillColor, [80, 130, 230, 200]);

  const { ScatterplotLayer } = await (await import('@deck.gl/layers'));
  const layer = new ScatterplotLayer({
    id: 'scatterplot',
    data: points,
    getPosition: (d: any) => [d.lng, d.lat],
    getRadius: (d: any) => d.radius ?? 100,
    getFillColor: (d: any) => (d.color ? toRGBA(d.color, fallbackColor) : fallbackColor),
    radiusUnits: 'meters',
    radiusScale,
    radiusMinPixels: 2,
    radiusMaxPixels: 60,
    stroked: true,
    getLineColor: [255, 255, 255, 200],
    lineWidthMinPixels: 1,
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, {
    center: resolvedCenter,
    zoom,
    style,
    pitch,
    bearing,
    layers: [layer],
  });
  return cleanup;
}
