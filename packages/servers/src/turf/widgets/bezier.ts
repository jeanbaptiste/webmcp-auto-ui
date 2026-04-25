// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeature, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { line, feature, resolution = 10000, sharpness = 0.85 } = data as any;
  const inputRaw = line ?? feature;
  if (!inputRaw) return renderEmpty(container, 'turf-bezier', 'Pass a <code>line</code> (LineString).');

  const { loadTurf } = await import('./shared.js');
  const turf = await loadTurf();
  const input = asFeature(turf, inputRaw);
  if (!input) return renderEmpty(container, 'turf-bezier', 'Could not parse line.');

  let smoothed: any = null;
  try {
    smoothed = turf.bezierSpline(input, { resolution, sharpness });
  } catch (e) {
    console.warn('[turf-bezier] failed', e);
  }

  const features = [stamp(input, 'input')];
  if (smoothed) features.push(stamp(smoothed, 'result'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { lineWidth: 3 });
  return cleanup;
}
