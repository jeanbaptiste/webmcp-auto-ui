// @ts-nocheck
import { setupMap, asFeatureCollection, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { points, geojson, numberOfClusters = 4 } = data as any;
  const inputRaw = points ?? geojson;
  if (!inputRaw) return renderEmpty(container, 'turf-clusters-kmeans', 'Pass <code>points</code> (FeatureCollection of points).');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const pts = asFeatureCollection(turf, inputRaw);
  if (!pts.features.length) return renderEmpty(container, 'turf-clusters-kmeans', 'Empty input.');

  let clustered: any = pts;
  try {
    clustered = turf.clustersKmeans(pts, { numberOfClusters });
  } catch (e) {
    console.warn('[turf-clusters-kmeans] failed', e);
  }

  const palette = ['#3388ff', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
  const enriched = clustered.features.map((f: any) => ({
    ...f,
    properties: { ...(f.properties ?? {}), _color: palette[(f.properties?.cluster ?? 0) % palette.length] },
  }));
  const fc = turf.featureCollection(enriched);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  map.addLayer({
    id: 'turf-circle',
    type: 'circle',
    source: 'turf',
    paint: {
      'circle-radius': 6,
      'circle-color': ['get', '_color'],
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 1,
    },
  });
  return cleanup;
}
