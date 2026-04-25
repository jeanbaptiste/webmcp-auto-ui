// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellsToFeatureCollection, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-bbox-fill — fill an axis-aligned bounding box with hexes.
 * params: { bbox: [west, south, east, north], resolution=7, style?, color? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { bbox, resolution = 7, style = 'voyager', color = '#9467bd', opacity = 0.45 } = data as any;
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every((n) => typeof n === 'number')) {
    return renderEmpty(container, 'h3-bbox-fill', 'Provide <code>bbox: [west, south, east, north]</code>.');
  }
  const [w, s, e, n] = bbox as number[];
  if (!(w < e && s < n)) return renderEmpty(container, 'h3-bbox-fill', 'Invalid bbox (west<east, south<north).');

  const ring: [number, number][] = [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ];
  const polygon = { type: 'Polygon', coordinates: [ring] };

  const cells = tryH3(() => h3.polygonToCells([ring], resolution, true), [] as string[]);
  if (!cells.length) return renderEmpty(container, 'h3-bbox-fill', 'No cells inside bbox at this resolution.');

  const fc = cellsToFeatureCollection(cells);
  const cx = (w + e) / 2;
  const cy = (s + n) / 2;
  const zoom = Math.max(1, Math.min(15, resolution + 1));

  const { map, cleanup } = await createMap(container, { center: [cx, cy], zoom, style });
  await whenLoaded(map);

  map.addSource('h3-cells', { type: 'geojson', data: fc });
  map.addSource('h3-bbox', { type: 'geojson', data: polygon });

  map.addLayer({
    id: 'h3-cells-fill',
    type: 'fill',
    source: 'h3-cells',
    paint: { 'fill-color': color, 'fill-opacity': opacity },
  });
  map.addLayer({
    id: 'h3-cells-line',
    type: 'line',
    source: 'h3-cells',
    paint: { 'line-color': color, 'line-width': 0.5, 'line-opacity': 0.7 },
  });
  map.addLayer({
    id: 'h3-bbox-line',
    type: 'line',
    source: 'h3-bbox',
    paint: { 'line-color': '#222', 'line-width': 2, 'line-dasharray': [4, 2] },
  });

  try {
    map.fitBounds([[w, s], [e, n]], { padding: 40, animate: false });
  } catch {
    // ignore
  }

  return cleanup;
}
