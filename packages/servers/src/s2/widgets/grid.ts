// @ts-nocheck
// s2-grid: ring of S2 cells around a center, using allNeighbors expanded.
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import {
  loadS2,
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
  const { lat, lng, level = 12, rings = 2, style = 'voyager' } = data as any;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return renderEmpty(container, 's2-grid', 'Pass {lat, lng, level?, rings?}.');
  }
  const s2 = await loadS2();
  const center = latLngToCellId(s2, lat, lng, level);

  // BFS expansion using allNeighbors at the same level
  const seen = new Set<string>();
  const ids: any[] = [];
  const seenAdd = (id: any) => {
    const k = id.toString();
    if (seen.has(k)) return false;
    seen.add(k);
    ids.push(id);
    return true;
  };
  seenAdd(center);
  let frontier: any[] = [center];
  for (let r = 0; r < Math.max(0, Math.min(8, rings)); r++) {
    const next: any[] = [];
    for (const id of frontier) {
      const ns = s2.s2.cellid.allNeighbors(id, level);
      for (const n of ns) {
        if (seenAdd(n)) next.push(n);
      }
    }
    frontier = next;
  }

  const fc = cellIdsToFeatureCollection(s2, ids);
  const c = cellCenter(s2, center);
  const { maplibre, map, cleanup } = await createMap(container, {
    center: c,
    zoom: Math.max(2, Math.min(17, level - 2)),
    style,
  });
  await whenLoaded(map);
  addCellsLayer(map, 's2grid', fc, { fillColor: '#5dc863', fillOpacity: 0.3 });
  fitToFeatures(maplibre, map, fc);
  return cleanup;
}
