// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellsToFeatureCollection, cellsCentroid, rampExpression, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-from-points — index a point cloud into H3 cells, color by density.
 * params: { points: [{lat, lng, weight?}], resolution=8, style?, ramp? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { points, resolution = 8, style = 'positron', ramp, opacity = 0.7 } = data as any;
  if (!Array.isArray(points) || !points.length) {
    return renderEmpty(container, 'h3-from-points', 'Provide <code>points: [{lat, lng, weight?}]</code>.');
  }

  const counts: Record<string, number> = {};
  for (const p of points) {
    if (typeof p?.lat !== 'number' || typeof p?.lng !== 'number') continue;
    const c = tryH3(() => h3.latLngToCell(p.lat, p.lng, resolution), null);
    if (!c) continue;
    counts[c] = (counts[c] ?? 0) + (typeof p.weight === 'number' ? p.weight : 1);
  }
  const cells = Object.keys(counts);
  if (!cells.length) return renderEmpty(container, 'h3-from-points', 'No valid points after indexing.');

  const fc = cellsToFeatureCollection(cells, (c) => ({ count: counts[c] }));
  const values = Object.values(counts);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const [cx, cy] = cellsCentroid(cells);
  const zoom = Math.max(1, Math.min(15, resolution + 1));

  const { map, cleanup } = await createMap(container, { center: [cx, cy], zoom, style });
  await whenLoaded(map);

  map.addSource('h3', { type: 'geojson', data: fc });
  map.addLayer({
    id: 'h3-fill',
    type: 'fill',
    source: 'h3',
    paint: { 'fill-color': rampExpression('count', min, max, ramp), 'fill-opacity': opacity },
  });
  map.addLayer({
    id: 'h3-outline',
    type: 'line',
    source: 'h3',
    paint: { 'line-color': '#222', 'line-width': 0.4, 'line-opacity': 0.5 },
  });

  return cleanup;
}
