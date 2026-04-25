// @ts-nocheck
// s2-level-compare: same point shown as cells at multiple levels (nested).
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import {
  loadS2,
  latLngToCellId,
  cellIdsToFeatureCollection,
  cellCenter,
  fitToFeatures,
  renderEmpty,
} from './shared.js';

const PALETTE = ['#440154', '#3b528b', '#21908c', '#5dc863', '#fde725', '#fa9b1f'];

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { lat, lng, levels = [4, 6, 8, 10, 12], style = 'voyager' } = data as any;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return renderEmpty(container, 's2-level-compare', 'Pass {lat, lng, levels?: number[]}.');
  }
  const s2 = await loadS2();
  const lvls: number[] = (Array.isArray(levels) ? levels : []).filter(
    (l) => typeof l === 'number' && l >= 0 && l <= 30,
  );
  const useLevels = lvls.length ? [...lvls].sort((a, b) => a - b) : [4, 6, 8, 10, 12];

  const c = [lng, lat] as [number, number];
  const { maplibre, map, cleanup } = await createMap(container, {
    center: c,
    zoom: Math.max(2, Math.min(15, useLevels[0] - 2)),
    style,
  });
  await whenLoaded(map);

  const allFcs: any[] = [];
  for (let i = 0; i < useLevels.length; i++) {
    const l = useLevels[i];
    const id = latLngToCellId(s2, lat, lng, l);
    const fc = cellIdsToFeatureCollection(s2, [id], () => ({ level: l }));
    const sid = `s2lvl-${l}`;
    map.addSource(sid, { type: 'geojson', data: fc });
    map.addLayer({
      id: `${sid}-line`,
      type: 'line',
      source: sid,
      paint: {
        'line-color': PALETTE[i % PALETTE.length],
        'line-width': 2,
      },
    });
    allFcs.push(fc);
  }
  // fit on the largest (lowest level → biggest)
  const big = allFcs[0];
  fitToFeatures(maplibre, map, big);
  return cleanup;
}
