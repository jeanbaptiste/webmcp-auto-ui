// @ts-nocheck
import { setupMap, addKindLayers, stamp, asPoint, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { origin, point, distance = 100, bearing = 90, units = 'kilometers' } = data as any;
  const inputRaw = origin ?? point;
  if (!inputRaw) return renderEmpty(container, 'turf-destination', 'Pass an <code>origin</code> point, <code>distance</code>, <code>bearing</code>.');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const o = asPoint(turf, inputRaw);
  if (!o) return renderEmpty(container, 'turf-destination', 'Could not parse origin.');

  let dest: any = null;
  let conn: any = null;
  try {
    dest = turf.destination(o, distance, bearing, { units });
    conn = turf.lineString([o.geometry.coordinates, dest.geometry.coordinates]);
  } catch (e) {
    console.warn('[turf-destination] failed', e);
  }

  const features = [stamp(o, 'input')];
  if (dest) features.push(stamp(dest, 'result'));
  if (conn) features.push(stamp(conn, 'accent'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { circleRadius: 7, lineWidth: 2 });
  return cleanup;
}
