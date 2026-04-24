// @ts-nocheck
import { createMap, whenLoaded } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [2.3522, 48.8566], zoom = 6, style = 'voyager', geojson, paint, type = 'auto' } = data as any;
  const { map, cleanup } = await createMap(container, { center, zoom, style });
  await whenLoaded(map);

  if (!geojson) return cleanup;

  map.addSource('gj', { type: 'geojson', data: geojson });

  const inferred = type === 'auto' ? inferType(geojson) : type;

  if (inferred === 'point' || inferred === 'any') {
    map.addLayer({
      id: 'gj-point',
      type: 'circle',
      source: 'gj',
      filter: ['==', '$type', 'Point'],
      paint: { 'circle-radius': 5, 'circle-color': '#e74c3c', 'circle-stroke-width': 1, 'circle-stroke-color': '#fff', ...(paint?.point ?? {}) },
    });
  }
  if (inferred === 'line' || inferred === 'any') {
    map.addLayer({
      id: 'gj-line',
      type: 'line',
      source: 'gj',
      filter: ['==', '$type', 'LineString'],
      paint: { 'line-color': '#3388ff', 'line-width': 2, ...(paint?.line ?? {}) },
    });
  }
  if (inferred === 'polygon' || inferred === 'any') {
    map.addLayer({
      id: 'gj-fill',
      type: 'fill',
      source: 'gj',
      filter: ['==', '$type', 'Polygon'],
      paint: { 'fill-color': '#3388ff', 'fill-opacity': 0.3, 'fill-outline-color': '#3388ff', ...(paint?.fill ?? {}) },
    });
  }

  return cleanup;
}

function inferType(gj: any): string {
  const types = new Set<string>();
  const features = gj.type === 'FeatureCollection' ? gj.features : [gj];
  for (const f of features) {
    const t = f?.geometry?.type ?? f?.type;
    if (t === 'Point' || t === 'MultiPoint') types.add('point');
    else if (t === 'LineString' || t === 'MultiLineString') types.add('line');
    else if (t === 'Polygon' || t === 'MultiPolygon') types.add('polygon');
  }
  if (types.size === 1) return [...types][0];
  return 'any';
}
