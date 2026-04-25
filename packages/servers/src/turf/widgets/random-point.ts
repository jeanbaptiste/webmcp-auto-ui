// @ts-nocheck
import { setupMap, addKindLayers, stamp, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { count = 50, bbox = [-10, 35, 30, 60] } = data as any;
  if (!Array.isArray(bbox) || bbox.length !== 4)
    return renderEmpty(container, 'turf-random-point', 'Pass <code>bbox</code> [w,s,e,n] and <code>count</code>.');

  const { loadTurf } = await import('./shared.js');
  const turf = await loadTurf();

  let pts: any = null;
  try {
    pts = turf.randomPoint(count, { bbox });
  } catch (e) {
    console.warn('[turf-random-point] failed', e);
  }

  const bboxPoly = turf.bboxPolygon(bbox);
  const features: any[] = [stamp(bboxPoly, 'input')];
  if (pts) features.push(...pts.features.map((f: any) => stamp(f, 'result')));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { fillOpacity: 0.1, circleRadius: 4 });
  return cleanup;
}
