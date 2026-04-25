// @ts-nocheck
import { setupMap, asFeatureCollection, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { points, polygons, inProperty = 'value', outProperty = 'values' } = data as any;
  if (!points || !polygons) return renderEmpty(container, 'turf-collect', 'Pass <code>points</code> and <code>polygons</code>.');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const pts = asFeatureCollection(turf, points);
  const polys = asFeatureCollection(turf, polygons);

  let collected: any = polys;
  try {
    collected = turf.collect(polys, pts, inProperty, outProperty);
  } catch (e) {
    console.warn('[turf-collect] failed', e);
  }

  // Compute count per polygon for color ramp
  let maxCount = 0;
  const enriched = collected.features.map((p: any) => {
    const arr = (p.properties?.[outProperty] ?? []) as any[];
    const c = arr.length;
    if (c > maxCount) maxCount = c;
    return { ...p, properties: { ...(p.properties ?? {}), _count: c } };
  });
  if (maxCount === 0) maxCount = 1;

  const fc = turf.featureCollection([...enriched, ...pts.features]);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  map.addLayer({
    id: 'turf-fill',
    type: 'fill',
    source: 'turf',
    filter: ['==', '$type', 'Polygon'],
    paint: {
      'fill-color': ['interpolate', ['linear'], ['coalesce', ['get', '_count'], 0],
        0, '#f7fbff',
        maxCount * 0.5, '#6baed6',
        maxCount, '#08306b',
      ],
      'fill-opacity': 0.65,
      'fill-outline-color': '#333',
    },
  });
  map.addLayer({
    id: 'turf-circle',
    type: 'circle',
    source: 'turf',
    filter: ['==', '$type', 'Point'],
    paint: { 'circle-radius': 3, 'circle-color': '#e74c3c', 'circle-stroke-color': '#fff', 'circle-stroke-width': 0.5 },
  });
  return cleanup;
}
