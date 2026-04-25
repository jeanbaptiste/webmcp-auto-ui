// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeatureCollection, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { geojson, feature } = data as any;
  const inputRaw = geojson ?? feature;
  if (!inputRaw) return renderEmpty(container, 'turf-envelope', 'Pass <code>geojson</code>.');

  const { loadTurf } = await import('./shared.js');
  const turf = await loadTurf();
  const input = asFeatureCollection(turf, inputRaw);

  let env: any = null;
  try {
    env = turf.envelope(input);
  } catch (e) {
    console.warn('[turf-envelope] failed', e);
  }

  const features: any[] = input.features.map((f: any) => stamp(f, 'input'));
  if (env) features.push(stamp(env, 'result'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { fillOpacity: 0.15 });
  return cleanup;
}
