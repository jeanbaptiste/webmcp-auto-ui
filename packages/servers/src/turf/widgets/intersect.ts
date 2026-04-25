// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeature, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { a, b } = data as any;
  if (!a || !b) return renderEmpty(container, 'turf-intersect', 'Pass two polygons as <code>a</code> and <code>b</code>.');

  const { loadTurf } = await import('./shared.js');
  const turf = await loadTurf();
  const fa = asFeature(turf, a);
  const fb = asFeature(turf, b);
  if (!fa || !fb) return renderEmpty(container, 'turf-intersect', 'Inputs must be polygons.');

  let result: any = null;
  try {
    result = turf.intersect(turf.featureCollection([fa, fb]));
  } catch (e) {
    console.warn('[turf-intersect] failed', e);
  }

  const features = [stamp(fa, 'input'), stamp(fb, 'input')];
  if (result) features.push(stamp(result, 'result'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { fillOpacity: 0.4 });
  return cleanup;
}
