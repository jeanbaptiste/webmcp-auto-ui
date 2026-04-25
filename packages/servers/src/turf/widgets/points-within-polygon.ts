// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeature, asFeatureCollection, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { points, polygon } = data as any;
  if (!points || !polygon) return renderEmpty(container, 'turf-points-within-polygon', 'Pass <code>points</code> and <code>polygon</code>.');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const pts = asFeatureCollection(turf, points);
  const poly = asFeature(turf, polygon);
  if (!poly) return renderEmpty(container, 'turf-points-within-polygon', 'Could not parse polygon.');

  let inside: any = null;
  try {
    inside = turf.pointsWithinPolygon(pts, turf.featureCollection([poly]));
  } catch (e) {
    console.warn('[turf-points-within-polygon] failed', e);
  }

  const insideSet = new Set((inside?.features ?? []).map((f: any) => JSON.stringify(f.geometry.coordinates)));
  const features: any[] = [stamp(poly, 'input')];
  for (const p of pts.features) {
    const k = insideSet.has(JSON.stringify(p.geometry.coordinates)) ? 'truthy' : 'falsy';
    features.push(stamp(p, k));
  }
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { fillOpacity: 0.2, circleRadius: 6 });
  return cleanup;
}
