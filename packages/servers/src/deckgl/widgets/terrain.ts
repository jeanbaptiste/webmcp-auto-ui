// @ts-nocheck
import { createDeckMap, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const {
    elevationData,
    texture,
    bounds,
    center = [0, 30],
    zoom = 11,
    style,
    pitch = 45,
    elevationDecoder = { rScaler: 256, gScaler: 1, bScaler: 1 / 256, offset: -32768 },
  } = data as any;
  if (!elevationData) {
    return renderEmpty(container, 'deckgl-terrain', 'Provide <code>{elevationData: "url-or-tile-template", bounds?: [w,s,e,n], texture?: url}</code>.');
  }

  const { TerrainLayer } = await import('@deck.gl/geo-layers');
  const layer = new TerrainLayer({
    id: 'terrain',
    elevationDecoder,
    elevationData,
    texture,
    bounds,
    minZoom: 0,
    maxZoom: 14,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
