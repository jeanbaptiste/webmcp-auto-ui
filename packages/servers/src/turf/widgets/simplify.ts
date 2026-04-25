// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeature, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { feature, geojson, tolerance = 0.01, highQuality = false } = data as any;
  const inputRaw = feature ?? geojson;
  if (!inputRaw) return renderEmpty(container, 'turf-simplify', 'Pass a <code>feature</code> (line or polygon).');

  const { loadTurf } = await import('./shared.js');
  const turf = await loadTurf();
  const input = asFeature(turf, inputRaw);
  if (!input) return renderEmpty(container, 'turf-simplify', 'Could not parse feature.');

  let simplified: any = null;
  try {
    // turf.simplify mutates — clone first
    simplified = turf.simplify(JSON.parse(JSON.stringify(input)), { tolerance, highQuality });
  } catch (e) {
    console.warn('[turf-simplify] failed', e);
  }

  const features = [stamp(input, 'input')];
  if (simplified) features.push(stamp(simplified, 'result'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { fillOpacity: 0.2, lineWidth: 2 });
  return cleanup;
}
