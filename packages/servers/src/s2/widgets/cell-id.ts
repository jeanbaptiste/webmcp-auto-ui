// @ts-nocheck
// s2-cell-id: render a single cell from an arbitrary cellId (token, "1/3210", or decimal).
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import {
  loadS2,
  resolveCellId,
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
  const { cellId, style = 'voyager' } = data as any;
  if (!cellId) {
    return renderEmpty(container, 's2-cell-id', 'Pass {cellId: <token | "face/path" | decimal>}.');
  }
  const s2 = await loadS2();
  const id = resolveCellId(s2, cellId);
  if (id === null || id === undefined) {
    return renderEmpty(container, 's2-cell-id', `Could not parse cellId: ${cellId}`);
  }
  if (!s2.s2.cellid.valid(id)) {
    return renderEmpty(container, 's2-cell-id', `Invalid cellId: ${cellId}`);
  }
  const fc = cellIdsToFeatureCollection(s2, [id]);
  const lvl = s2.s2.cellid.level(id);
  const c = cellCenter(s2, id);
  const { maplibre, map, cleanup } = await createMap(container, {
    center: c,
    zoom: Math.max(2, Math.min(17, lvl - 1)),
    style,
  });
  await whenLoaded(map);
  addCellsLayer(map, 's2cellid', fc, { fillColor: '#fde725', fillOpacity: 0.5 });
  fitToFeatures(maplibre, map, fc);
  return cleanup;
}
