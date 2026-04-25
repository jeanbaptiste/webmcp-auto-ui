// @ts-nocheck
import { setupMap, addKindLayers, stamp, asPoint, addLabelOverlay, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { a, b } = data as any;
  if (!a || !b) return renderEmpty(container, 'turf-bearing', 'Pass two points <code>a</code> and <code>b</code>.');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const pa = asPoint(turf, a);
  const pb = asPoint(turf, b);
  if (!pa || !pb) return renderEmpty(container, 'turf-bearing', 'Could not parse points.');

  const brg = turf.bearing(pa, pb);
  const line = turf.lineString([pa.geometry.coordinates, pb.geometry.coordinates]);

  const fc = turf.featureCollection([stamp(pa, 'input'), stamp(pb, 'result'), stamp(line, 'accent')]);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { circleRadius: 7, lineWidth: 3 });
  const removeLabel = addLabelOverlay(container, `Bearing: ${brg.toFixed(2)}°`);
  return () => {
    removeLabel();
    cleanup();
  };
}
