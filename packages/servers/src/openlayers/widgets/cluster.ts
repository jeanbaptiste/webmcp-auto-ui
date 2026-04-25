// @ts-nocheck
import { createMap, toLonLat, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { points = [], center, zoom, distance = 40 } = (data ?? {}) as any;
  if (!Array.isArray(points) || points.length === 0) {
    return renderEmpty(container, 'openlayers-cluster', 'Pass `points: [[lon, lat], ...]` or `[{lon, lat}, ...]`.');
  }
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const Cluster = (await import('ol/source/Cluster')).default;
  const Feature = (await import('ol/Feature')).default;
  const { Point } = await import('ol/geom');
  const { fromLonLat } = await import('ol/proj');
  const { Style, Fill, Stroke, Circle, Text } = await import('ol/style');

  const features: any[] = [];
  for (const p of points) {
    const ll = toLonLat(p);
    if (ll) features.push(new Feature({ geometry: new Point(fromLonLat(ll)) }));
  }

  const source = new VectorSource({ features });
  const clusterSource = new Cluster({ distance, source });

  const styleCache: Record<string, any> = {};
  const layer = new VectorLayer({
    source: clusterSource,
    style: (feature: any) => {
      const size = feature.get('features').length;
      let s = styleCache[size];
      if (!s) {
        const r = Math.min(10 + Math.log2(size) * 4, 30);
        s = new Style({
          image: new Circle({
            radius: r,
            fill: new Fill({ color: 'rgba(51,136,255,0.7)' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
          }),
          text: new Text({
            text: String(size),
            fill: new Fill({ color: '#fff' }),
            font: 'bold 12px system-ui',
          }),
        });
        styleCache[size] = s;
      }
      return s;
    },
  });

  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
