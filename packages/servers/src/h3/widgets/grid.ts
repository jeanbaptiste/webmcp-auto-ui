// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellsToFeatureCollection, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-grid — display a hexagonal grid around a center point.
 * params: { lat, lng, resolution=8, k=4, style?, color?, opacity? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { lat, lng, resolution = 8, k = 4, style = 'voyager', color = '#3388ff', opacity = 0.35 } = data as any;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return renderEmpty(container, 'h3-grid', 'Provide numeric <code>lat</code> and <code>lng</code>.');
  }

  const center = tryH3(() => h3.latLngToCell(lat, lng, resolution), null);
  if (!center) return renderEmpty(container, 'h3-grid', 'Invalid lat/lng/resolution combination.');

  const cells = tryH3(() => h3.gridDisk(center, k), [] as string[]);
  if (!cells.length) return renderEmpty(container, 'h3-grid');

  const fc = cellsToFeatureCollection(cells);
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
    paint: { 'line-color': color, 'line-width': 1 },
  });

  return cleanup;
}
