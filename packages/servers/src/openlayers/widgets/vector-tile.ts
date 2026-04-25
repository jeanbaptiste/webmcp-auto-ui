// @ts-nocheck
import { createMap, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { url, center, zoom, attributions } = (data ?? {}) as any;
  if (!url) return renderEmpty(container, 'openlayers-vector-tile', 'Pass an MVT `url` template like `https://example/tiles/{z}/{x}/{y}.pbf`.');
  const VectorTileLayer = (await import('ol/layer/VectorTile')).default;
  const VectorTileSource = (await import('ol/source/VectorTile')).default;
  const MVT = (await import('ol/format/MVT')).default;

  const layer = new VectorTileLayer({
    source: new VectorTileSource({ format: new MVT(), url, attributions }),
  });
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
