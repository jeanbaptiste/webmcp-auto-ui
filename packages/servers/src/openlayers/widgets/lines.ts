// @ts-nocheck
import { createMap, toLonLat, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { lines = [], center, zoom } = (data ?? {}) as any;
  if (!Array.isArray(lines) || lines.length === 0) {
    return renderEmpty(container, 'openlayers-lines', 'Pass `lines: [{ coordinates: [[lon,lat], ...], color?, width? }]`.');
  }
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const Feature = (await import('ol/Feature')).default;
  const { LineString } = await import('ol/geom');
  const { fromLonLat } = await import('ol/proj');
  const { Style, Stroke } = await import('ol/style');

  const features = lines
    .map((l: any) => {
      const coords = (l.coordinates ?? []).map(toLonLat).filter(Boolean).map(fromLonLat);
      if (coords.length < 2) return null;
      const f = new Feature({ geometry: new LineString(coords) });
      f.set('color', l.color ?? '#3388ff');
      f.set('width', l.width ?? 3);
      return f;
    })
    .filter(Boolean);

  const layer = new VectorLayer({
    source: new VectorSource({ features }),
    style: (feat: any) =>
      new Style({ stroke: new Stroke({ color: feat.get('color'), width: feat.get('width') }) }),
  });
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
