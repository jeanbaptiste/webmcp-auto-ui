// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellToFeature, cellCenter, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-parent — cellToParent(cell, resolution) — show a cell + its ancestor.
 * params: { cell: <h3>, parentResolution?, style? }
 *   OR    { lat, lng, resolution, parentResolution, style? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { cell, lat, lng, resolution = 9, parentResolution, style = 'voyager' } = data as any;

  let target: string | null = null;
  if (typeof cell === 'string') target = cell;
  else if (typeof lat === 'number' && typeof lng === 'number') {
    target = tryH3(() => h3.latLngToCell(lat, lng, resolution), null);
  }
  if (!target) {
    return renderEmpty(container, 'h3-parent', 'Provide <code>cell</code> or lat/lng + resolution.');
  }

  const childRes = h3.getResolution(target);
  const pRes = typeof parentResolution === 'number' ? parentResolution : Math.max(0, childRes - 1);
  if (pRes >= childRes) {
    return renderEmpty(container, 'h3-parent', 'Parent resolution must be lower than child resolution.');
  }

  const parentCell = tryH3(() => h3.cellToParent(target, pRes), null);
  if (!parentCell) return renderEmpty(container, 'h3-parent');

  const parentFc = { type: 'FeatureCollection', features: [cellToFeature(parentCell)] };
  const childFc = { type: 'FeatureCollection', features: [cellToFeature(target)] };
  const [cx, cy] = cellCenter(parentCell);
  const zoom = Math.max(1, Math.min(15, pRes + 2));

  const { map, cleanup } = await createMap(container, { center: [cx, cy], zoom, style });
  await whenLoaded(map);

  map.addSource('h3-parent', { type: 'geojson', data: parentFc });
  map.addSource('h3-child', { type: 'geojson', data: childFc });

  map.addLayer({
    id: 'h3-parent-fill',
    type: 'fill',
    source: 'h3-parent',
    paint: { 'fill-color': '#3388ff', 'fill-opacity': 0.15 },
  });
  map.addLayer({
    id: 'h3-parent-line',
    type: 'line',
    source: 'h3-parent',
    paint: { 'line-color': '#3388ff', 'line-width': 2 },
  });
  map.addLayer({
    id: 'h3-child-fill',
    type: 'fill',
    source: 'h3-child',
    paint: { 'fill-color': '#d62728', 'fill-opacity': 0.6 },
  });
  map.addLayer({
    id: 'h3-child-line',
    type: 'line',
    source: 'h3-child',
    paint: { 'line-color': '#d62728', 'line-width': 1.5 },
  });

  return cleanup;
}
