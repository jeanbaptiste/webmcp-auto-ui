// @ts-nocheck
// s2-region-coverer: visualize how RegionCoverer options change a cap covering.
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
    lat,
    lng,
    radiusKm = 50,
    minLevel = 0,
    maxLevel = 30,
    maxCells = 8,
    levelMod = 1,
    style = 'voyager',
  } = data as any;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return renderEmpty(
      container,
      's2-region-coverer',
      'Pass {lat, lng, radiusKm?, maxCells?, minLevel?, maxLevel?, levelMod?}.',
    );
  }

  const s2 = await loadS2();
  let cellIds: any[] = [];
  try {
    const ll = s2.s2.LatLng.fromDegrees(lat, lng);
    const center = s2.s2.Point.fromLatLng(ll);
    // earth radius ~= 6371 km. ChordAngle from radians.
    const radians = (radiusKm * 1000) / 6371008.8;
    let cap: any;
    if (typeof s2.s2.Cap.fromCenterAngle === 'function') {
      cap = s2.s2.Cap.fromCenterAngle(center, radians);
    } else if (typeof s2.s2.Cap.fromCenterHeight === 'function') {
      const h = 1 - Math.cos(radians);
      cap = s2.s2.Cap.fromCenterHeight(center, h);
    } else if (typeof s2.s2.Cap.fromCenterArea === 'function') {
      const area = 2 * Math.PI * (1 - Math.cos(radians));
      cap = s2.s2.Cap.fromCenterArea(center, area);
    }
    if (!cap) throw new Error('s2.Cap constructor not found');

    const rc = new s2.s2.RegionCoverer({ minLevel, maxLevel, maxCells, levelMod });
    const cu = rc.covering(cap);
    cellIds = [...cu];
  } catch (e) {
    return renderEmpty(container, 's2-region-coverer', `Coverer failed: ${(e as any)?.message ?? e}`);
  }

  const fc = cellIdsToFeatureCollection(s2, cellIds);

  // Build a circle approximation for visual reference
  const circleFc = makeCircleFeature(lat, lng, radiusKm);

  const { maplibre, map, cleanup } = await createMap(container, {
    center: [lng, lat],
    zoom: 4,
    style,
  });
  await whenLoaded(map);
  addCellsLayer(map, 's2rc', fc, { fillColor: '#9b59b6', fillOpacity: 0.3 });
  map.addSource('s2rc-circle', { type: 'geojson', data: circleFc });
  map.addLayer({
    id: 's2rc-circle-line',
    type: 'line',
    source: 's2rc-circle',
    paint: { 'line-color': '#e74c3c', 'line-width': 2 },
  });
  fitToFeatures(maplibre, map, fc);
  return cleanup;
}

function makeCircleFeature(lat: number, lng: number, radiusKm: number): any {
  const ring: [number, number][] = [];
  const N = 64;
  const earthR = 6371; // km
  const latR = (lat * Math.PI) / 180;
  for (let i = 0; i <= N; i++) {
    const theta = (i / N) * 2 * Math.PI;
    const dLat = (radiusKm / earthR) * Math.cos(theta);
    const dLng = ((radiusKm / earthR) * Math.sin(theta)) / Math.cos(latR);
    ring.push([lng + (dLng * 180) / Math.PI, lat + (dLat * 180) / Math.PI]);
  }
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } },
    ],
  };
}
