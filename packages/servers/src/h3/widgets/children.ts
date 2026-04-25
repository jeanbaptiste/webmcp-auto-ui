// @ts-nocheck
import * as h3 from 'h3-js';
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import { cellToFeature, cellsToFeatureCollection, cellCenter, renderEmpty, tryH3 } from './shared.js';

/**
 * h3-children — cellToChildren(parent, childRes) — show a parent + its children.
 * params: { parent: <h3>, childResolution?, style? }
 *   OR    { lat, lng, parentResolution, childResolution, style? }
 */
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { parent, lat, lng, parentResolution = 5, childResolution, style = 'voyager' } = data as any;

  let parentCell: string | null = null;
  if (typeof parent === 'string') parentCell = parent;
  else if (typeof lat === 'number' && typeof lng === 'number') {
    parentCell = tryH3(() => h3.latLngToCell(lat, lng, parentResolution), null);
  }
  if (!parentCell) {
    return renderEmpty(container, 'h3-children', 'Provide <code>parent</code> H3 string or lat/lng + parentResolution.');
  }

  const pRes = h3.getResolution(parentCell);
  const cRes = typeof childResolution === 'number' ? childResolution : Math.min(15, pRes + 1);
  if (cRes <= pRes) {
    return renderEmpty(container, 'h3-children', 'Child resolution must be greater than parent resolution.');
  }

  const children = tryH3(() => h3.cellToChildren(parentCell, cRes), [] as string[]);
  if (!children.length) return renderEmpty(container, 'h3-children');

  const childFc = cellsToFeatureCollection(children);
  const parentFc = { type: 'FeatureCollection', features: [cellToFeature(parentCell)] };
  const [cx, cy] = cellCenter(parentCell);
  const zoom = Math.max(1, Math.min(15, pRes + 2));

  const { map, cleanup } = await createMap(container, { center: [cx, cy], zoom, style });
  await whenLoaded(map);

  map.addSource('h3-parent', { type: 'geojson', data: parentFc });
  map.addSource('h3-children', { type: 'geojson', data: childFc });

  map.addLayer({
    id: 'h3-children-fill',
    type: 'fill',
    source: 'h3-children',
    paint: { 'fill-color': '#3388ff', 'fill-opacity': 0.25 },
  });
  map.addLayer({
    id: 'h3-children-line',
    type: 'line',
    source: 'h3-children',
    paint: { 'line-color': '#3388ff', 'line-width': 0.5, 'line-opacity': 0.7 },
  });
  map.addLayer({
    id: 'h3-parent-line',
    type: 'line',
    source: 'h3-parent',
    paint: { 'line-color': '#d62728', 'line-width': 2.5 },
  });

  return cleanup;
}
