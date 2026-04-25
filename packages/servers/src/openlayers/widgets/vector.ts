// @ts-nocheck
import { createMap, toLonLat, buildStyle, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { features = [], center, zoom, style: styleOpts } = (data ?? {}) as any;
  if (!Array.isArray(features) || features.length === 0) {
    return renderEmpty(container, 'openlayers-vector', 'Pass `features: [{ type: "Point|LineString|Polygon", coordinates: [...] }]`.');
  }
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const Feature = (await import('ol/Feature')).default;
  const { Point, LineString, Polygon } = await import('ol/geom');
  const { fromLonLat } = await import('ol/proj');

  const olFeatures: any[] = [];
  for (const f of features) {
    let geom: any = null;
    const t = (f.type ?? 'Point').toLowerCase();
    if (t === 'point') {
      const ll = toLonLat(f.coordinates ?? f.coord ?? f.position);
      if (ll) geom = new Point(fromLonLat(ll));
    } else if (t === 'linestring' || t === 'line') {
      const coords = (f.coordinates ?? []).map(toLonLat).filter(Boolean).map(fromLonLat);
      if (coords.length >= 2) geom = new LineString(coords);
    } else if (t === 'polygon') {
      const rings = (f.coordinates ?? []).map((ring: any) =>
        ring.map(toLonLat).filter(Boolean).map(fromLonLat),
      );
      if (rings.length) geom = new Polygon(rings);
    }
    if (geom) {
      const feat = new Feature({ geometry: geom, ...(f.properties ?? {}) });
      olFeatures.push(feat);
    }
  }

  const source = new VectorSource({ features: olFeatures });
  const style = await buildStyle(styleOpts ?? {});
  const layer = new VectorLayer({ source, style });

  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
