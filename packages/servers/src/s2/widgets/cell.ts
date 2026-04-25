// @ts-nocheck
// s2-cell: render a single S2 cell at a (lat, lng) point at a given level.
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
  const { lat, lng, level = 12, style = 'voyager', fillColor = '#3388ff' } = data as any;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return renderEmpty(container, 's2-cell', 'Pass {lat, lng, level?}.');
  }
  const s2 = await loadS2();
  const id = latLngToCellId(s2, lat, lng, level);
  const fc = cellIdsToFeatureCollection(s2, [id]);
  const center = cellCenter(s2, id);

  const { maplibre, map, cleanup } = await createMap(container, {
    center,
    zoom: Math.max(2, Math.min(17, level - 1)),
    style,
  });
  await whenLoaded(map);
  addCellsLayer(map, 's2cell', fc, { fillColor, fillOpacity: 0.45 });
  fitToFeatures(maplibre, map, fc);
  return cleanup;
}
