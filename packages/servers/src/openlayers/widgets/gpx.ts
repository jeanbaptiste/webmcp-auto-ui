// @ts-nocheck
import { createMap, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { url, center, zoom } = (data ?? {}) as any;
  if (!url) return renderEmpty(container, 'openlayers-gpx', 'Pass a `url` to a GPX file (track / waypoints).');
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const GPX = (await import('ol/format/GPX')).default;

  const layer = new VectorLayer({
    source: new VectorSource({ url, format: new GPX() }),
  });
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
