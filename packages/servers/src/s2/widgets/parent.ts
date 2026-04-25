// @ts-nocheck
// s2-parent: render the parent cell at a target level (with the original child highlighted).
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import {
  loadS2,
  resolveCellId,
  latLngToCellId,
  cellIdsToFeatureCollection,
  cellCenter,
  fitToFeatures,
  renderEmpty,
} from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { cellId, lat, lng, level = 14, parentLevel, style = 'voyager' } = data as any;
  const s2 = await loadS2();
  let child: any = null;
  if (cellId) child = resolveCellId(s2, cellId);
  else if (typeof lat === 'number' && typeof lng === 'number') {
    child = latLngToCellId(s2, lat, lng, level);
  }
  if (!child) {
    return renderEmpty(container, 's2-parent', 'Pass {cellId, parentLevel?} or {lat, lng, level?, parentLevel?}.');
  }
  const childLvl = s2.s2.cellid.level(child);
  const pLvl = Math.max(0, Math.min(childLvl - 1, parentLevel ?? Math.max(0, childLvl - 4)));
  if (pLvl >= childLvl) {
    return renderEmpty(container, 's2-parent', 'parentLevel must be smaller than the cell level.');
  }
  const parent = s2.s2.cellid.parent(child, pLvl);

  const fcParent = cellIdsToFeatureCollection(s2, [parent], () => ({ kind: 'parent' }));
  const fcChild = cellIdsToFeatureCollection(s2, [child], () => ({ kind: 'child' }));
  const c = cellCenter(s2, parent);
  const { maplibre, map, cleanup } = await createMap(container, {
    center: c,
    zoom: Math.max(2, Math.min(17, pLvl)),
    style,
  });
  await whenLoaded(map);
  map.addSource('s2p', { type: 'geojson', data: fcParent });
  map.addSource('s2c', { type: 'geojson', data: fcChild });
  map.addLayer({
    id: 's2p-fill',
    type: 'fill',
    source: 's2p',
    paint: { 'fill-color': '#3b528b', 'fill-opacity': 0.25 },
  });
  map.addLayer({
    id: 's2p-line',
    type: 'line',
    source: 's2p',
    paint: { 'line-color': '#222', 'line-width': 1.5 },
  });
  map.addLayer({
    id: 's2c-fill',
    type: 'fill',
    source: 's2c',
    paint: { 'fill-color': '#fde725', 'fill-opacity': 0.7 },
  });
  fitToFeatures(maplibre, map, fcParent);
  return cleanup;
}
