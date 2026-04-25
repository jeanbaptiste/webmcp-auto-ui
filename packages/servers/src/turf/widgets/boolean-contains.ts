// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeature, addLabelOverlay, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { a, b } = data as any;
  if (!a || !b) return renderEmpty(container, 'turf-boolean-contains', 'Pass two features <code>a</code> (outer) and <code>b</code> (inner).');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const fa = asFeature(turf, a);
  const fb = asFeature(turf, b);
  if (!fa || !fb) return renderEmpty(container, 'turf-boolean-contains', 'Could not parse features.');

  let result = false;
  try {
    result = turf.booleanContains(fa, fb);
  } catch (e) {
    console.warn('[turf-boolean-contains] failed', e);
  }

  const fc = turf.featureCollection([stamp(fa, result ? 'truthy' : 'falsy'), stamp(fb, 'accent')]);
  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { fillOpacity: 0.35 });
  const removeLabel = addLabelOverlay(container, `contains: ${result ? 'YES' : 'NO'}`);
  return () => {
    removeLabel();
    cleanup();
  };
}
