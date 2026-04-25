// @ts-nocheck
import { createMap, buildStyle, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { url, topojson, center, zoom, style: styleOpts } = (data ?? {}) as any;
  if (!url && !topojson) {
    return renderEmpty(container, 'openlayers-topojson', 'Pass `url` (TopoJSON) or inline `topojson`.');
  }
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const TopoJSON = (await import('ol/format/TopoJSON')).default;

  const fmt = new TopoJSON();
  let source: any;
  if (topojson) {
    const features = fmt.readFeatures(topojson, {
      featureProjection: 'EPSG:3857',
      dataProjection: 'EPSG:4326',
    });
    source = new VectorSource({ features });
  } else {
    source = new VectorSource({ url, format: fmt });
  }
  const style = await buildStyle(styleOpts ?? { fill: 'rgba(51,136,255,0.15)', stroke: '#3388ff', strokeWidth: 1 });
  const layer = new VectorLayer({ source, style });
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
