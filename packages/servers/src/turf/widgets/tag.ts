// @ts-nocheck
import { setupMap, stamp, asFeatureCollection, renderEmpty, COLORS } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { points, polygons, field = 'name', outField = 'tag' } = data as any;
  if (!points || !polygons) return renderEmpty(container, 'turf-tag', 'Pass <code>points</code> and <code>polygons</code>.');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const pts = asFeatureCollection(turf, points);
  const polys = asFeatureCollection(turf, polygons);

  let tagged: any = pts;
  try {
    tagged = turf.tag(pts, polys, field, outField);
  } catch (e) {
    console.warn('[turf-tag] failed', e);
  }

  // Build categorical color map from polygon field values
  const cats: string[] = [];
  for (const p of polys.features) {
    const v = String(p.properties?.[field] ?? '');
    if (!cats.includes(v)) cats.push(v);
  }
  const palette = ['#3388ff', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
  const catColor: Record<string, string> = {};
  cats.forEach((c, i) => (catColor[c] = palette[i % palette.length]));

  const features: any[] = polys.features.map((p: any) => {
    const v = String(p.properties?.[field] ?? '');
    return { ...p, properties: { ...(p.properties ?? {}), _color: catColor[v] ?? COLORS.neutral } };
  });
  for (const t of tagged.features) {
    const v = String(t.properties?.[outField] ?? '');
    features.push({ ...t, properties: { ...(t.properties ?? {}), _color: catColor[v] ?? COLORS.neutral } });
  }
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  map.addLayer({
    id: 'turf-fill',
    type: 'fill',
    source: 'turf',
    filter: ['==', '$type', 'Polygon'],
    paint: { 'fill-color': ['get', '_color'], 'fill-opacity': 0.25 },
  });
  map.addLayer({
    id: 'turf-line',
    type: 'line',
    source: 'turf',
    filter: ['==', '$type', 'Polygon'],
    paint: { 'line-color': ['get', '_color'], 'line-width': 1.5 },
  });
  map.addLayer({
    id: 'turf-circle',
    type: 'circle',
    source: 'turf',
    filter: ['==', '$type', 'Point'],
    paint: {
      'circle-radius': 6,
      'circle-color': ['get', '_color'],
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 1,
    },
  });
  return cleanup;
}
