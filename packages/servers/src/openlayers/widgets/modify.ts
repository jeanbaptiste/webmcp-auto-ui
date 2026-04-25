// @ts-nocheck
import { createMap, toLonLat } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { features: input = [], center, zoom } = (data ?? {}) as any;
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const Feature = (await import('ol/Feature')).default;
  const { Point, LineString, Polygon } = await import('ol/geom');
  const { fromLonLat } = await import('ol/proj');
  const Modify = (await import('ol/interaction/Modify')).default;

  const olFeatures: any[] = [];
  for (const f of input) {
    const t = (f.type ?? 'Point').toLowerCase();
    if (t === 'point') {
      const ll = toLonLat(f.coordinates);
      if (ll) olFeatures.push(new Feature(new Point(fromLonLat(ll))));
    } else if (t === 'linestring' || t === 'line') {
      const coords = (f.coordinates ?? []).map(toLonLat).filter(Boolean).map(fromLonLat);
      if (coords.length >= 2) olFeatures.push(new Feature(new LineString(coords)));
    } else if (t === 'polygon') {
      const rings = (f.coordinates ?? []).map((r: any) => r.map(toLonLat).filter(Boolean).map(fromLonLat));
      if (rings.length) olFeatures.push(new Feature(new Polygon(rings)));
    }
  }

  const source = new VectorSource({ features: olFeatures });
  const layer = new VectorLayer({ source });
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  map.addInteraction(new Modify({ source }));
  return cleanup;
}
