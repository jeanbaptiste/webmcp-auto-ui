// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellsToFeatureCollection, cellsCentroid, rampExpression, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-path — gridPathCells(start, end) — hex chain between two cells.
 * params: { from: {lat, lng}, to: {lat, lng}, resolution=7, style? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { from, to, resolution = 7, style = 'voyager', opacity = 0.7 } = data as any;
  if (!from || !to || typeof from.lat !== 'number' || typeof to.lat !== 'number') {
    return renderEmpty(container, 'h3-path', 'Provide <code>from</code> and <code>to</code> with lat/lng.');
  }

  const a = tryH3(() => h3.latLngToCell(from.lat, from.lng, resolution), null);
  const b = tryH3(() => h3.latLngToCell(to.lat, to.lng, resolution), null);
  if (!a || !b) return renderEmpty(container, 'h3-path', 'Invalid coordinates.');

  const cells = tryH3(() => h3.gridPathCells(a, b), [] as string[]);
  if (!cells.length) return renderEmpty(container, 'h3-path', 'No path found between cells.');

  const fc = cellsToFeatureCollection(cells, (_c, i) => ({ step: i }));
  const [cx, cy] = cellsCentroid(cells);
  const zoom = Math.max(1, Math.min(15, resolution + 1));

  const { map, cleanup } = await createMap(container, { center: [cx, cy], zoom, style });
  await whenLoaded(map);

  map.addSource('h3', { type: 'geojson', data: fc });
  map.addLayer({
    id: 'h3-fill',
    type: 'fill',
    source: 'h3',
    paint: { 'fill-color': rampExpression('step', 0, cells.length - 1), 'fill-opacity': opacity },
  });
  map.addLayer({
    id: 'h3-outline',
    type: 'line',
    source: 'h3',
    paint: { 'line-color': '#222', 'line-width': 0.5, 'line-opacity': 0.6 },
  });

  return cleanup;
}
