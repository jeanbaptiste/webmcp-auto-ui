// @ts-nocheck
import { setupMap, asFeatureCollection, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { points, geojson, z } = data as any;
  const inputRaw = points ?? geojson;
  if (!inputRaw) return renderEmpty(container, 'turf-tin', 'Pass <code>points</code> (FeatureCollection of points).');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const pts = asFeatureCollection(turf, inputRaw);
  if (pts.features.length < 3) return renderEmpty(container, 'turf-tin', 'Need at least 3 points for triangulation.');

  let tin: any = null;
  try {
    tin = turf.tin(pts, z);
  } catch (e) {
    console.warn('[turf-tin] failed', e);
  }

  const features: any[] = [];
  if (tin) features.push(...tin.features.map((f: any, i: number) => ({ ...f, properties: { ...(f.properties ?? {}), _idx: i } })));
  features.push(...pts.features.map((p: any) => ({ ...p, properties: { ...(p.properties ?? {}), _isPoint: true } })));
  const fc = turf.featureCollection(features);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  map.addLayer({
    id: 'turf-fill',
    type: 'fill',
    source: 'turf',
    filter: ['==', '$type', 'Polygon'],
    paint: {
      'fill-color': ['interpolate', ['linear'], ['coalesce', ['get', '_idx'], 0], 0, '#fee5d9', 50, '#fcae91', 200, '#a50f15'],
      'fill-opacity': 0.45,
      'fill-outline-color': '#666',
    },
  });
  map.addLayer({
    id: 'turf-line',
    type: 'line',
    source: 'turf',
    filter: ['==', '$type', 'Polygon'],
    paint: { 'line-color': '#666', 'line-width': 0.8 },
  });
  map.addLayer({
    id: 'turf-circle',
    type: 'circle',
    source: 'turf',
    filter: ['==', '$type', 'Point'],
    paint: { 'circle-radius': 4, 'circle-color': '#222', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 },
  });
  return cleanup;
}
