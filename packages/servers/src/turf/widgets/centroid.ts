// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeatureCollection, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { geojson, feature } = data as any;
  const inputRaw = geojson ?? feature;
  if (!inputRaw) return renderEmpty(container, 'turf-centroid', 'Pass <code>geojson</code>.');

  const { loadTurf } = await import('./shared.js');
  const turf = await loadTurf();
  const input = asFeatureCollection(turf, inputRaw);
  if (!input.features.length) return renderEmpty(container, 'turf-centroid', 'Empty input.');

  let c: any = null;
  try {
    c = turf.centroid(input);
  } catch (e) {
    console.warn('[turf-centroid] failed', e);
  }

  const features: any[] = input.features.map((f: any) => stamp(f, 'input'));
  if (c) features.push(stamp(c, 'result'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { circleRadius: 8 });
  return cleanup;
}
