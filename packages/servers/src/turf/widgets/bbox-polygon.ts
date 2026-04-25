// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeatureCollection, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { geojson, feature } = data as any;
  const inputRaw = geojson ?? feature;
  if (!inputRaw) return renderEmpty(container, 'turf-bbox-polygon', 'Pass <code>geojson</code>.');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const input = asFeatureCollection(turf, inputRaw);

  let bboxPoly: any = null;
  try {
    const bbox = turf.bbox(input);
    bboxPoly = turf.bboxPolygon(bbox);
  } catch (e) {
    console.warn('[turf-bbox-polygon] failed', e);
  }

  const features: any[] = input.features.map((f: any) => stamp(f, 'input'));
  if (bboxPoly) features.push(stamp(bboxPoly, 'result'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { fillOpacity: 0.15 });
  return cleanup;
}
