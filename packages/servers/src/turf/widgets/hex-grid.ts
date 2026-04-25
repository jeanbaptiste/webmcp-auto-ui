// @ts-nocheck
import { setupMap, addKindLayers, stamp, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { bbox = [-5, 40, 10, 52], cellSide = 100, units = 'kilometers' } = data as any;
  if (!Array.isArray(bbox) || bbox.length !== 4)
    return renderEmpty(container, 'turf-hex-grid', 'Pass <code>bbox</code>, <code>cellSide</code>.');

  const { loadTurf } = await import('./shared.js');
  const turf = await loadTurf();

  let grid: any = null;
  try {
    grid = turf.hexGrid(bbox, cellSide, { units });
  } catch (e) {
    console.warn('[turf-hex-grid] failed', e);
  }

  const features: any[] = [];
  if (grid) features.push(...grid.features.map((f: any) => stamp(f, 'input')));
  features.push(stamp(turf.bboxPolygon(bbox), 'result'));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  addKindLayers(map, 'turf', { fillOpacity: 0.15 });
  return cleanup;
}
