// @ts-nocheck
// s2-bbox-cover: cover a lat/lng bounding box with S2 cells.
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import {
  loadS2,
  cellIdsToFeatureCollection,
  addCellsLayer,
  fitToFeatures,
  renderEmpty,
} from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const {
    bbox,
    minLat,
    maxLat,
    minLng,
    maxLng,
    minLevel = 4,
    maxLevel = 12,
    maxCells = 32,
    style = 'voyager',
  } = data as any;

  let bMinLat: number, bMaxLat: number, bMinLng: number, bMaxLng: number;
  if (Array.isArray(bbox) && bbox.length === 4) {
    [bMinLng, bMinLat, bMaxLng, bMaxLat] = bbox;
  } else if (
    typeof minLat === 'number' &&
    typeof maxLat === 'number' &&
    typeof minLng === 'number' &&
    typeof maxLng === 'number'
  ) {
    bMinLat = minLat;
    bMaxLat = maxLat;
    bMinLng = minLng;
    bMaxLng = maxLng;
  } else {
    return renderEmpty(
      container,
      's2-bbox-cover',
      'Pass {bbox: [minLng, minLat, maxLng, maxLat]} or {minLat, maxLat, minLng, maxLng}.',
    );
  }

  const s2 = await loadS2();
  let cellIds: any[] = [];
  try {
    const lo = s2.s2.LatLng.fromDegrees(bMinLat, bMinLng);
    const hi = s2.s2.LatLng.fromDegrees(bMaxLat, bMaxLng);
    let rect: any;
    if (typeof s2.s2.Rect.fromLatLng === 'function') {
      rect = s2.s2.Rect.fromLatLng(lo);
      if (typeof rect.addPoint === 'function') rect = rect.addPoint(hi);
      else if (typeof s2.s2.Rect.fromPointPair === 'function') {
        rect = s2.s2.Rect.fromPointPair(lo, hi);
      }
    } else if (typeof s2.s2.Rect.fromPointPair === 'function') {
      rect = s2.s2.Rect.fromPointPair(lo, hi);
    }
    if (!rect) throw new Error('cannot build s2 Rect');
    const rc = new s2.s2.RegionCoverer({ minLevel, maxLevel, maxCells });
    const cu = rc.covering(rect);
    cellIds = [...cu];
  } catch (e) {
    return renderEmpty(container, 's2-bbox-cover', `RegionCoverer failed: ${(e as any)?.message ?? e}`);
  }

  const fc = cellIdsToFeatureCollection(s2, cellIds);
  const inputFc = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [bMinLng, bMinLat],
            [bMaxLng, bMinLat],
            [bMaxLng, bMaxLat],
            [bMinLng, bMaxLat],
            [bMinLng, bMinLat],
          ]],
        },
      },
    ],
  };
  const { maplibre, map, cleanup } = await createMap(container, {
    center: [(bMinLng + bMaxLng) / 2, (bMinLat + bMaxLat) / 2],
    zoom: 4,
    style,
  });
  await whenLoaded(map);
  addCellsLayer(map, 's2bbox', fc, { fillColor: '#21908c', fillOpacity: 0.3 });
  map.addSource('s2bbox-input', { type: 'geojson', data: inputFc });
  map.addLayer({
    id: 's2bbox-input-line',
    type: 'line',
    source: 's2bbox-input',
    paint: { 'line-color': '#e74c3c', 'line-width': 2, 'line-dasharray': [2, 2] },
  });
  fitToFeatures(maplibre, map, fc);
  return cleanup;
}
