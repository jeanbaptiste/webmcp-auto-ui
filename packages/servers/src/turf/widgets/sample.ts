// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeatureCollection, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { features, geojson, num = 10 } = data as any;
  const inputRaw = features ?? geojson;
  if (!inputRaw) return renderEmpty(container, 'turf-sample', 'Pass <code>features</code> (FeatureCollection) and <code>num</code>.');

  const { loadTurf } = await import('./shared.js');
  const turf = await loadTurf();
  const fc = asFeatureCollection(turf, inputRaw);
  if (!fc.features.length) return renderEmpty(container, 'turf-sample', 'Empty input.');

  let sampled: any = null;
  try {
    sampled = turf.sample(fc, num);
  } catch (e) {
    console.warn('[turf-sample] failed', e);
  }

  const sampledKeys = new Set(
    (sampled?.features ?? []).map((f: any) => JSON.stringify(f.geometry?.coordinates ?? f.geometry)),
  );
  const out: any[] = [];
  for (const f of fc.features) {
    const key = JSON.stringify(f.geometry?.coordinates ?? f.geometry);
    out.push(stamp(f, sampledKeys.has(key) ? 'result' : 'input'));
  }
  const finalFc = turf.featureCollection(out);

  const { map, cleanup } = await setupMap(container, {}, finalFc);
  map.addSource('turf', { type: 'geojson', data: finalFc });
  addKindLayers(map, 'turf', { circleRadius: 6, fillOpacity: 0.25 });
  return cleanup;
}
