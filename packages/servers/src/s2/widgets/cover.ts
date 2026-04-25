// @ts-nocheck
// s2-cover: S2 cell coverage of a GeoJSON polygon (RegionCoverer).
import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';
import {
  loadS2,
  cellIdsToFeatureCollection,
  addCellsLayer,
  fitToFeatures,
  renderEmpty,
} from './shared.js';

const RAD = Math.PI / 180;

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const {
    geojson,
    minLevel = 4,
    maxLevel = 12,
    maxCells = 32,
    style = 'voyager',
  } = data as any;
  if (!geojson) {
    return renderEmpty(container, 's2-cover', 'Pass {geojson: <Polygon|Feature>, minLevel?, maxLevel?, maxCells?}.');
  }
  const s2 = await loadS2();

  // Extract first polygon ring (lng, lat)
  const ring = extractFirstPolygonRing(geojson);
  if (!ring || ring.length < 3) {
    return renderEmpty(container, 's2-cover', 'GeoJSON must contain a Polygon with at least 3 vertices.');
  }

  // Build s2 Loop from points
  const points = ring.map(([lng, lat]: [number, number]) => {
    const ll = s2.s2.LatLng.fromDegrees(lat, lng);
    return s2.s2.Point.fromLatLng(ll);
  });
  // drop closing duplicate if equal
  if (
    points.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
  ) {
    points.pop();
  }

  let cellIds: any[] = [];
  try {
    const loop = new s2.s2.Loop(points);
    const polygon = s2.s2.Polygon.fromLoops?.([loop]) ?? new s2.s2.Polygon([loop]);
    const rc = new s2.s2.RegionCoverer({ minLevel, maxLevel, maxCells });
    const cu = rc.covering(polygon);
    cellIds = [...cu];
  } catch (e) {
    // fallback: cover the bbox
    cellIds = await coverBBoxFallback(s2, ring, { minLevel, maxLevel, maxCells });
  }

  if (!cellIds.length) {
    return renderEmpty(container, 's2-cover', 'No covering produced.');
  }
  const fc = cellIdsToFeatureCollection(s2, cellIds);
  const inputFc = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }],
  };
  const { maplibre, map, cleanup } = await createMap(container, {
    center: [ring[0][0], ring[0][1]],
    zoom: 4,
    style,
  });
  await whenLoaded(map);
  addCellsLayer(map, 's2cover', fc, { fillColor: '#3388ff', fillOpacity: 0.3 });
  map.addSource('s2cover-input', { type: 'geojson', data: inputFc });
  map.addLayer({
    id: 's2cover-input-line',
    type: 'line',
    source: 's2cover-input',
    paint: { 'line-color': '#e74c3c', 'line-width': 2 },
  });
  fitToFeatures(maplibre, map, fc);
  return cleanup;
}

function extractFirstPolygonRing(gj: any): [number, number][] | null {
  let geom = gj;
  if (gj?.type === 'FeatureCollection') geom = gj.features?.[0]?.geometry;
  else if (gj?.type === 'Feature') geom = gj.geometry;
  if (!geom) return null;
  if (geom.type === 'Polygon') return geom.coordinates?.[0] ?? null;
  if (geom.type === 'MultiPolygon') return geom.coordinates?.[0]?.[0] ?? null;
  return null;
}

async function coverBBoxFallback(
  s2: any,
  ring: [number, number][],
  opts: { minLevel: number; maxLevel: number; maxCells: number },
): Promise<any[]> {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lng, lat] of ring) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  try {
    const r1Mod: any = await import('s2js');
    const lo = r1Mod.s2.LatLng.fromDegrees(minLat, minLng);
    const hi = r1Mod.s2.LatLng.fromDegrees(maxLat, maxLng);
    const rect = r1Mod.s2.Rect.fromLatLng(lo).addPoint?.(hi) ?? null;
    if (rect) {
      const rc = new s2.s2.RegionCoverer({ ...opts });
      const cu = rc.covering(rect);
      return [...cu];
    }
  } catch {
    // ignore
  }
  return [];
}
