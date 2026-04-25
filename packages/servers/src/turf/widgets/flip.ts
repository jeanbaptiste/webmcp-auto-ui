// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeature, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { feature, geojson } = data as any;
  const inputRaw = feature ?? geojson;
  if (!inputRaw) return renderEmpty(container, 'turf-flip', 'Pass a <code>feature</code>.');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const input = asFeature(turf, inputRaw);
  if (!input) return renderEmpty(container, 'turf-flip', 'Could not parse feature.');

  let flipped: any = null;
  try {
    flipped = turf.flip(JSON.parse(JSON.stringify(input)));
  } catch (e) {
    console.warn('[turf-flip] failed', e);
  }

  const features = [stamp(input, 'input')];
  if (flipped) features.push(stamp(flipped, 'result'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf');
  return cleanup;
}
