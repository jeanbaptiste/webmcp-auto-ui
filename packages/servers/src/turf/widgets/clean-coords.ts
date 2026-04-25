// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeature, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { feature, geojson } = data as any;
  const inputRaw = feature ?? geojson;
  if (!inputRaw) return renderEmpty(container, 'turf-clean-coords', 'Pass a <code>feature</code>.');

  const { loadTurf } = await import('./shared.js');
  const turf = await loadTurf();
  const input = asFeature(turf, inputRaw);
  if (!input) return renderEmpty(container, 'turf-clean-coords', 'Could not parse feature.');

  let cleaned: any = null;
  try {
    cleaned = turf.cleanCoords(JSON.parse(JSON.stringify(input)));
  } catch (e) {
    console.warn('[turf-clean-coords] failed', e);
  }

  const features = [stamp(input, 'input')];
  if (cleaned) features.push(stamp(cleaned, 'result'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf');
  return cleanup;
}
