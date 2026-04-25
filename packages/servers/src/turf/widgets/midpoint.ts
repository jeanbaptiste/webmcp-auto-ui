// @ts-nocheck
import { setupMap, addKindLayers, stamp, asPoint, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { a, b } = data as any;
  if (!a || !b) return renderEmpty(container, 'turf-midpoint', 'Pass two points <code>a</code> and <code>b</code>.');

  const { loadTurf } = await import('./shared.js');
  const turf = await loadTurf();
  const pa = asPoint(turf, a);
  const pb = asPoint(turf, b);
  if (!pa || !pb) return renderEmpty(container, 'turf-midpoint', 'Could not parse points.');

  let mid: any = null;
  try {
    mid = turf.midpoint(pa, pb);
  } catch (e) {
    console.warn('[turf-midpoint] failed', e);
  }

  const line = turf.lineString([pa.geometry.coordinates, pb.geometry.coordinates]);
  const features = [stamp(pa, 'input'), stamp(pb, 'input'), stamp(line, 'input')];
  if (mid) features.push(stamp(mid, 'result'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { circleRadius: 7, lineWidth: 2 });
  return cleanup;
}
