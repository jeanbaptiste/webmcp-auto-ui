// @ts-nocheck
// s2-children: render the 4 children (or descendants at depth N) of a parent cell.
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import {
  loadS2,
  resolveCellId,
  latLngToCellId,
  cellIdsToFeatureCollection,
  cellCenter,
  addCellsLayer,
  fitToFeatures,
  renderEmpty,
} from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { cellId, lat, lng, level = 8, depth = 1, style = 'voyager' } = data as any;
  const s2 = await loadS2();
  let parent: any = null;
  if (cellId) parent = resolveCellId(s2, cellId);
  else if (typeof lat === 'number' && typeof lng === 'number') {
    parent = latLngToCellId(s2, lat, lng, level);
  }
  if (!parent) {
    return renderEmpty(container, 's2-children', 'Pass {cellId} or {lat, lng, level?, depth?}.');
  }
  if (s2.s2.cellid.isLeaf(parent)) {
    return renderEmpty(container, 's2-children', 'Cell is a leaf; no children at level 30.');
  }

  const targetLevel = Math.min(30, s2.s2.cellid.level(parent) + Math.max(1, Math.min(4, depth)));
  const ids: any[] = [];
  let id = s2.s2.cellid.childBeginAtLevel(parent, targetLevel);
  const end = s2.s2.cellid.childEndAtLevel(parent, targetLevel);
  let safety = 0;
  while (id !== end && safety < 4096) {
    ids.push(id);
    id = s2.s2.cellid.next(id);
    safety++;
  }

  const fc = cellIdsToFeatureCollection(s2, ids);
  const fcParent = cellIdsToFeatureCollection(s2, [parent], () => ({ kind: 'parent' }));
  const c = cellCenter(s2, parent);
  const { maplibre, map, cleanup } = await createMap(container, {
    center: c,
    zoom: Math.max(2, Math.min(17, targetLevel - 2)),
    style,
  });
  await whenLoaded(map);
  addCellsLayer(map, 's2children', fc, { fillColor: '#3b528b', fillOpacity: 0.3 });
  map.addSource('s2parent', { type: 'geojson', data: fcParent });
  map.addLayer({
    id: 's2parent-line',
    type: 'line',
    source: 's2parent',
    paint: { 'line-color': '#e74c3c', 'line-width': 2 },
  });
  fitToFeatures(maplibre, map, fc);
  return cleanup;
}
