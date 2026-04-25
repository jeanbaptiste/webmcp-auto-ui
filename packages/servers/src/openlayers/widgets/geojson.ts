// @ts-nocheck
import { createMap, buildStyle, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { url, geojson, center, zoom, style: styleOpts } = (data ?? {}) as any;
  if (!url && !geojson) {
    return renderEmpty(container, 'openlayers-geojson', 'Pass `url` (GeoJSON endpoint) or `geojson` (inline FeatureCollection).');
  }
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const GeoJSON = (await import('ol/format/GeoJSON')).default;

  const fmt = new GeoJSON();
  let source: any;
  if (geojson) {
    const features = fmt.readFeatures(geojson, {
      featureProjection: 'EPSG:3857',
      dataProjection: 'EPSG:4326',
    });
    source = new VectorSource({ features });
  } else {
    source = new VectorSource({ url, format: fmt });
  }
  const style = await buildStyle(styleOpts ?? { fill: 'rgba(51,136,255,0.2)', stroke: '#3388ff', strokeWidth: 2 });
  const layer = new VectorLayer({ source, style });

  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
