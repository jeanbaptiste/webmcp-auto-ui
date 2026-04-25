// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeature, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { feature, geojson } = data as any;
  const inputRaw = feature ?? geojson;
  if (!inputRaw) return renderEmpty(container, 'turf-center-of-mass', 'Pass a polygon as <code>feature</code>.');

  const { loadTurf } = await import('./shared.js');
  const turf = await loadTurf();
  const input = asFeature(turf, inputRaw);
  if (!input) return renderEmpty(container, 'turf-center-of-mass', 'Could not parse feature.');

  let com: any = null;
  try {
    com = turf.centerOfMass(input);
  } catch (e) {
    console.warn('[turf-center-of-mass] failed', e);
  }

  const features = [stamp(input, 'input')];
  if (com) features.push(stamp(com, 'result'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { circleRadius: 8 });
  return cleanup;
}
