// @ts-nocheck
// s2-neighbors: cell + its allNeighbors, distinguished by color.
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import {
  loadS2,
  latLngToCellId,
  cellIdsToFeatureCollection,
  resolveCellId,
  cellCenter,
  fitToFeatures,
  renderEmpty,
} from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { lat, lng, level = 12, cellId, style = 'voyager' } = data as any;
  const s2 = await loadS2();
  let center: any = null;
  if (cellId) {
    center = resolveCellId(s2, cellId);
  } else if (typeof lat === 'number' && typeof lng === 'number') {
    center = latLngToCellId(s2, lat, lng, level);
  }
  if (!center) {
    return renderEmpty(container, 's2-neighbors', 'Pass {lat, lng, level?} or {cellId, level?}.');
  }
  const lvl = s2.s2.cellid.level(center);
  const ns = s2.s2.cellid.allNeighbors(center, lvl);

  const fcCenter = cellIdsToFeatureCollection(s2, [center], () => ({ kind: 'center' }));
  const fcN = cellIdsToFeatureCollection(s2, ns, () => ({ kind: 'neighbor' }));

  const c = cellCenter(s2, center);
  const { maplibre, map, cleanup } = await createMap(container, {
    center: c,
    zoom: Math.max(2, Math.min(17, lvl - 2)),
    style,
  });
  await whenLoaded(map);
  map.addSource('s2n', { type: 'geojson', data: fcN });
  map.addSource('s2c', { type: 'geojson', data: fcCenter });
  map.addLayer({
    id: 's2n-fill',
    type: 'fill',
    source: 's2n',
    paint: { 'fill-color': '#5dc863', 'fill-opacity': 0.35 },
  });
  map.addLayer({
    id: 's2n-line',
    type: 'line',
    source: 's2n',
    paint: { 'line-color': '#1a7a3c', 'line-width': 1 },
  });
  map.addLayer({
    id: 's2c-fill',
    type: 'fill',
    source: 's2c',
    paint: { 'fill-color': '#e74c3c', 'fill-opacity': 0.55 },
  });
  map.addLayer({
    id: 's2c-line',
    type: 'line',
    source: 's2c',
    paint: { 'line-color': '#922', 'line-width': 1.5 },
  });
  // fit on union
  const all = { type: 'FeatureCollection', features: [...fcCenter.features, ...fcN.features] };
  fitToFeatures(maplibre, map, all);
  return cleanup;
}
