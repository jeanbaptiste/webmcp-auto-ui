// @ts-nocheck
import { setupMap, addKindLayers, stamp, asPoint, asFeatureCollection, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { target, points } = data as any;
  if (!target || !points) return renderEmpty(container, 'turf-nearest-point', 'Pass a <code>target</code> point and a <code>points</code> set.');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const t = asPoint(turf, target);
  const pts = asFeatureCollection(turf, points);
  if (!t || !pts.features.length) return renderEmpty(container, 'turf-nearest-point', 'Could not parse inputs.');

  let nearest: any = null;
  try {
    nearest = turf.nearestPoint(t, pts);
  } catch (e) {
    console.warn('[turf-nearest-point] failed', e);
  }

  const features: any[] = [stamp(t, 'accent', { _label: 'target' })];
  for (const p of pts.features) {
    const isNearest =
      nearest &&
      JSON.stringify(p.geometry.coordinates) === JSON.stringify(nearest.geometry.coordinates);
    features.push(stamp(p, isNearest ? 'result' : 'input'));
  }
  if (nearest) {
    features.push(
      stamp(turf.lineString([t.geometry.coordinates, nearest.geometry.coordinates]), 'result'),
    );
  }
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { circleRadius: 7, lineWidth: 2 });
  return cleanup;
}
