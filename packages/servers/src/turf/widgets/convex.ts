// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeatureCollection, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { points, geojson } = data as any;
  const inputRaw = points ?? geojson;
  if (!inputRaw) return renderEmpty(container, 'turf-convex', 'Pass <code>points</code> (FeatureCollection of points).');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const input = asFeatureCollection(turf, inputRaw);
  if (!input.features.length) return renderEmpty(container, 'turf-convex', 'Empty input.');

  let hull: any = null;
  try {
    hull = turf.convex(input);
  } catch (e) {
    console.warn('[turf-convex] failed', e);
  }

  const features: any[] = input.features.map((f: any) => stamp(f, 'input'));
  if (hull) features.push(stamp(hull, 'result'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { fillOpacity: 0.25 });
  return cleanup;
}
