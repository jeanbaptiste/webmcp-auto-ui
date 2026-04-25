// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellsToFeatureCollection, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-ring — gridRing(center, k) — ring of hexagons at exact distance k.
 * Falls back to set difference (gridDisk(k) - gridDisk(k-1)) on pentagon errors.
 * params: { lat, lng, resolution=8, k=3, style?, color? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { lat, lng, resolution = 8, k = 3, style = 'voyager', color = '#e74c3c', opacity = 0.55 } = data as any;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return renderEmpty(container, 'h3-ring', 'Provide numeric <code>lat</code> and <code>lng</code>.');
  }
  const center = tryH3(() => h3.latLngToCell(lat, lng, resolution), null);
  if (!center) return renderEmpty(container, 'h3-ring', 'Invalid lat/lng/resolution.');

  let ring: string[] = tryH3(() => h3.gridRingUnsafe(center, k), [] as string[]);
  if (!ring.length) {
    const outer = tryH3(() => h3.gridDisk(center, k), [] as string[]);
    const inner = new Set(tryH3(() => h3.gridDisk(center, Math.max(0, k - 1)), [] as string[]));
    ring = outer.filter((c) => !inner.has(c));
  }
  if (!ring.length) return renderEmpty(container, 'h3-ring');

  const fc = cellsToFeatureCollection(ring);
  const zoom = Math.max(1, Math.min(15, resolution + 2));

  const { map, cleanup } = await createMap(container, { center: [lng, lat], zoom, style });
  await whenLoaded(map);

  map.addSource('h3', { type: 'geojson', data: fc });
  map.addLayer({
    id: 'h3-fill',
    type: 'fill',
    source: 'h3',
    paint: { 'fill-color': color, 'fill-opacity': opacity },
  });
  map.addLayer({
    id: 'h3-outline',
    type: 'line',
    source: 'h3',
    paint: { 'line-color': color, 'line-width': 1.2 },
  });

  return cleanup;
}
