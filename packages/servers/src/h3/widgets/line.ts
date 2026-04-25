// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellsToFeatureCollection, cellsCentroid, rampExpression, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-line — line between two lat/lng points, snapped to an H3 hex chain.
 * Same algorithm as h3-path but accepts coordinates directly and overlays the
 * straight LineString on top of the hex chain to compare ideal vs discretized.
 * params: { from: {lat, lng}, to: {lat, lng}, resolution=7, style? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { from, to, resolution = 7, style = 'voyager', opacity = 0.55 } = data as any;
  if (!from || !to || typeof from.lat !== 'number' || typeof to.lat !== 'number') {
    return renderEmpty(container, 'h3-line', 'Provide <code>from</code> and <code>to</code> with lat/lng.');
  }

  const a = tryH3(() => h3.latLngToCell(from.lat, from.lng, resolution), null);
  const b = tryH3(() => h3.latLngToCell(to.lat, to.lng, resolution), null);
  if (!a || !b) return renderEmpty(container, 'h3-line', 'Invalid coordinates.');

  const cells = tryH3(() => h3.gridPathCells(a, b), [] as string[]);
  if (!cells.length) return renderEmpty(container, 'h3-line', 'No path between cells (likely too far apart at this resolution).');

  const fc = cellsToFeatureCollection(cells, (_c, i) => ({ step: i }));
  const lineFc = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: [[from.lng, from.lat], [to.lng, to.lat]] },
  };
  const [cx, cy] = cellsCentroid(cells);
  const zoom = Math.max(1, Math.min(15, resolution + 1));

  const { map, cleanup } = await createMap(container, { center: [cx, cy], zoom, style });
  await whenLoaded(map);

  map.addSource('h3-chain', { type: 'geojson', data: fc });
  map.addSource('h3-line', { type: 'geojson', data: lineFc });

  map.addLayer({
    id: 'h3-chain-fill',
    type: 'fill',
    source: 'h3-chain',
    paint: { 'fill-color': rampExpression('step', 0, cells.length - 1), 'fill-opacity': opacity },
  });
  map.addLayer({
    id: 'h3-chain-line',
    type: 'line',
    source: 'h3-chain',
    paint: { 'line-color': '#222', 'line-width': 0.4, 'line-opacity': 0.5 },
  });
  map.addLayer({
    id: 'h3-line',
    type: 'line',
    source: 'h3-line',
    paint: { 'line-color': '#d62728', 'line-width': 2.5, 'line-dasharray': [3, 2] },
  });

  return cleanup;
}
