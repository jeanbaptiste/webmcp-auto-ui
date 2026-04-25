// @ts-nocheck
import { createMap, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { url, center, zoom } = (data ?? {}) as any;
  if (!url) return renderEmpty(container, 'openlayers-kml', 'Pass a `url` to a KML file.');
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const KML = (await import('ol/format/KML')).default;

  const layer = new VectorLayer({
    source: new VectorSource({ url, format: new KML() }),
  });
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
