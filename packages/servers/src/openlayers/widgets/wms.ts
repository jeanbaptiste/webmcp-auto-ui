// @ts-nocheck
import { createMap, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { url, layers: wmsLayers, center, zoom, params = {}, transparent = true } = (data ?? {}) as any;
  if (!url || !wmsLayers) {
    return renderEmpty(container, 'openlayers-wms', 'Pass `url` (WMS endpoint) and `layers` (comma-separated layer names).');
  }
  const TileLayer = (await import('ol/layer/Tile')).default;
  const TileWMS = (await import('ol/source/TileWMS')).default;
  const layer = new TileLayer({
    source: new TileWMS({
      url,
      params: { LAYERS: wmsLayers, TILED: true, TRANSPARENT: transparent, ...params },
      crossOrigin: 'anonymous',
    }),
  });
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
