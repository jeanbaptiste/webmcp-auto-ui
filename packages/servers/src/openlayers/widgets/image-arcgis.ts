// @ts-nocheck
import { createMap, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { url, center, zoom, params = {} } = (data ?? {}) as any;
  if (!url) return renderEmpty(container, 'openlayers-image-arcgis', 'Pass `url` (ArcGIS REST MapServer endpoint).');
  const ImageLayer = (await import('ol/layer/Image')).default;
  const ImageArcGISRest = (await import('ol/source/ImageArcGISRest')).default;
  const layer = new ImageLayer({
    source: new ImageArcGISRest({ url, params, crossOrigin: 'anonymous' }),
  });
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
