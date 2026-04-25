// @ts-nocheck
// s2-from-points: index points → cells, color by point density.
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import {
  loadS2,
  latLngToCellId,
  cellIdsToFeatureCollection,
  rampExpression,
  cellsCentroid,
  fitToFeatures,
  renderEmpty,
} from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { points, level = 10, style = 'voyager' } = data as any;
  if (!Array.isArray(points) || !points.length) {
    return renderEmpty(container, 's2-from-points', 'Pass {points: [{lat, lng}, ...], level?}.');
  }
  const s2 = await loadS2();
  const counts = new Map<string, { id: any; n: number }>();
  for (const p of points) {
    const lat = p?.lat ?? p?.[1];
    const lng = p?.lng ?? p?.lon ?? p?.[0];
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;
    const id = latLngToCellId(s2, lat, lng, level);
    const k = id.toString();
    const cur = counts.get(k);
    if (cur) cur.n++;
    else counts.set(k, { id, n: 1 });
  }
  const ids = [...counts.values()].map((v) => v.id);
  const fc = cellIdsToFeatureCollection(s2, ids, (id) => ({
    count: counts.get(id.toString())?.n ?? 0,
  }));

  const max = Math.max(1, ...[...counts.values()].map((v) => v.n));
  const center = cellsCentroid(s2, ids);
  const { maplibre, map, cleanup } = await createMap(container, {
    center,
    zoom: Math.max(2, Math.min(15, level - 2)),
    style,
  });
  await whenLoaded(map);
  map.addSource('pts', { type: 'geojson', data: fc });
  map.addLayer({
    id: 'pts-fill',
    type: 'fill',
    source: 'pts',
    paint: {
      'fill-color': rampExpression('count', 1, max),
      'fill-opacity': 0.55,
    },
  });
  map.addLayer({
    id: 'pts-line',
    type: 'line',
    source: 'pts',
    paint: { 'line-color': '#222', 'line-width': 0.5 },
  });
  fitToFeatures(maplibre, map, fc);
  return cleanup;
}
