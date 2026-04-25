// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeature, addLabelOverlay, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { a, b } = data as any;
  if (!a || !b) return renderEmpty(container, 'turf-boolean-overlap', 'Pass two features <code>a</code> and <code>b</code>.');

  const { loadTurf } = await import('./shared.js');
  const turf = await loadTurf();
  const fa = asFeature(turf, a);
  const fb = asFeature(turf, b);
  if (!fa || !fb) return renderEmpty(container, 'turf-boolean-overlap', 'Could not parse features.');

  let result = false;
  try {
    result = turf.booleanOverlap(fa, fb);
  } catch (e) {
    console.warn('[turf-boolean-overlap] failed', e);
  }

  const kind = result ? 'truthy' : 'falsy';
  const fc = turf.featureCollection([stamp(fa, kind), stamp(fb, kind)]);
  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { fillOpacity: 0.35 });
  const removeLabel = addLabelOverlay(container, `overlap: ${result ? 'YES' : 'NO'}`);
  return () => {
    removeLabel();
    cleanup();
  };
}
