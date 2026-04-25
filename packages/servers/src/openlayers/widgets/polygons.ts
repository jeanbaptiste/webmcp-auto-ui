// @ts-nocheck
import { createMap, toLonLat, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { polygons = [], center, zoom } = (data ?? {}) as any;
  if (!Array.isArray(polygons) || polygons.length === 0) {
    return renderEmpty(container, 'openlayers-polygons', 'Pass `polygons: [{ coordinates: [[[lon,lat], ...]], color? }]`.');
  }
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const Feature = (await import('ol/Feature')).default;
  const { Polygon } = await import('ol/geom');
  const { fromLonLat } = await import('ol/proj');
  const { Style, Fill, Stroke } = await import('ol/style');

  const features = polygons
    .map((p: any) => {
      const rings = (p.coordinates ?? []).map((ring: any) => ring.map(toLonLat).filter(Boolean).map(fromLonLat));
      if (!rings.length) return null;
      const f = new Feature({ geometry: new Polygon(rings) });
      f.set('color', p.color ?? '#3388ff');
      return f;
    })
    .filter(Boolean);

  const layer = new VectorLayer({
    source: new VectorSource({ features }),
    style: (feat: any) =>
      new Style({
        fill: new Fill({ color: 'rgba(51,136,255,0.25)' }),
        stroke: new Stroke({ color: feat.get('color'), width: 2 }),
      }),
  });
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
