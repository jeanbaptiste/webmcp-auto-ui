// @ts-nocheck
import { setupMap, addKindLayers, stamp, asFeature, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { feature, geojson, distance = 100, units = 'kilometers' } = data as any;
  const inputRaw = feature ?? geojson;
  if (!inputRaw) return renderEmpty(container, 'turf-buffer', 'Pass <code>feature</code> (Feature/Geometry) and <code>distance</code>.');

  const { map, cleanup, turf } = await setupMap(container, {});
  const input = asFeature(turf, inputRaw);
  if (!input) return renderEmpty(container, 'turf-buffer', 'Could not parse input as a Feature.');

  let result: any = null;
  try {
    result = turf.buffer(input, distance, { units });
  } catch (e) {
    console.warn('[turf-buffer] failed', e);
  }

  const features = [stamp(input, 'input')];
  if (result) features.push(stamp(result, 'result'));
  const fc = turf.featureCollection(features);

  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf');
  try {
    const bbox = turf.bbox(fc);
    map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, duration: 0, maxZoom: 16 });
  } catch {}
  return cleanup;
}
