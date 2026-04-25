// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellsToFeatureCollection, rampExpression, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-disk — gridDisk(center, k) colored by ring distance from center.
 * params: { lat, lng, resolution=8, k=5, style? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { lat, lng, resolution = 8, k = 5, style = 'voyager', opacity = 0.6 } = data as any;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return renderEmpty(container, 'h3-disk', 'Provide numeric <code>lat</code> and <code>lng</code>.');
  }

  const center = tryH3(() => h3.latLngToCell(lat, lng, resolution), null);
  if (!center) return renderEmpty(container, 'h3-disk', 'Invalid lat/lng/resolution.');

  // Use gridDiskDistances to get the ring index per cell.
  const dist = tryH3(() => h3.gridDiskDistances(center, k), [] as string[][]);
  const cells: string[] = [];
  const distOf: Record<string, number> = {};
  for (let i = 0; i < dist.length; i++) {
    for (const c of dist[i]) {
      cells.push(c);
      distOf[c] = i;
    }
  }
  if (!cells.length) return renderEmpty(container, 'h3-disk');

  const fc = cellsToFeatureCollection(cells, (c) => ({ ring: distOf[c] }));
  const zoom = Math.max(1, Math.min(15, resolution + 2));

  const { map, cleanup } = await createMap(container, { center: [lng, lat], zoom, style });
  await whenLoaded(map);

  map.addSource('h3', { type: 'geojson', data: fc });
  map.addLayer({
    id: 'h3-fill',
    type: 'fill',
    source: 'h3',
    paint: { 'fill-color': rampExpression('ring', 0, k), 'fill-opacity': opacity },
  });
  map.addLayer({
    id: 'h3-outline',
    type: 'line',
    source: 'h3',
    paint: { 'line-color': '#222', 'line-width': 0.6, 'line-opacity': 0.5 },
  });

  return cleanup;
}
