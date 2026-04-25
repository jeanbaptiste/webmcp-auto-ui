// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeature, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { line, feature, distance = 50, units = 'kilometers' } = data as any;
  const inputRaw = line ?? feature;
  if (!inputRaw) return renderEmpty(container, 'turf-along', 'Pass a <code>line</code> and <code>distance</code>.');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const input = asFeature(turf, inputRaw);
  if (!input) return renderEmpty(container, 'turf-along', 'Could not parse line.');

  let pt: any = null;
  try {
    pt = turf.along(input, distance, { units });
  } catch (e) {
    console.warn('[turf-along] failed', e);
  }

  const features = [stamp(input, 'input')];
  if (pt) features.push(stamp(pt, 'result'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { circleRadius: 8 });
  return cleanup;
}
