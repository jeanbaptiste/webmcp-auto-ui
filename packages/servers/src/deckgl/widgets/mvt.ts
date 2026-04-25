// @ts-nocheck
import { createDeckMap, toRGBA, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { tileUrl, center = [0, 30], zoom = 3, style, pitch = 0, minZoom = 0, maxZoom = 14, fillColor, lineColor } = data as any;
  if (!tileUrl) return renderEmpty(container, 'deckgl-mvt', 'Provide <code>{tileUrl: "https://.../{z}/{x}/{y}.pbf"}</code>.');
  const fillFb = toRGBA(fillColor, [120, 180, 230, 100]);
  const lineFb = toRGBA(lineColor, [40, 60, 100, 220]);

  const { MVTLayer } = await import('@deck.gl/geo-layers');
  const layer = new MVTLayer({
    id: 'mvt',
    data: tileUrl,
    minZoom,
    maxZoom,
    getFillColor: fillFb,
    getLineColor: lineFb,
    lineWidthMinPixels: 1,
    stroked: true,
    filled: true,
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
