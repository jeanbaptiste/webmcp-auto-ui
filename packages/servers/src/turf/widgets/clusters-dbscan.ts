// @ts-nocheck
import { setupMap, asFeatureCollection, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { points, geojson, maxDistance = 100, units = 'kilometers', minPoints = 3 } = data as any;
  const inputRaw = points ?? geojson;
  if (!inputRaw) return renderEmpty(container, 'turf-clusters-dbscan', 'Pass <code>points</code>, <code>maxDistance</code>.');

  const turfMod = await import('@turf/turf');
  const turf = turfMod.default ?? turfMod;
  const pts = asFeatureCollection(turf, inputRaw);
  if (!pts.features.length) return renderEmpty(container, 'turf-clusters-dbscan', 'Empty input.');

  let clustered: any = pts;
  try {
    clustered = turf.clustersDbscan(pts, maxDistance, { units, minPoints });
  } catch (e) {
    console.warn('[turf-clusters-dbscan] failed', e);
  }

  const palette = ['#3388ff', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
  const enriched = clustered.features.map((f: any) => {
    const cluster = f.properties?.cluster;
    const dbscan = f.properties?.dbscan; // 'core'|'edge'|'noise'
    let color = '#bbb';
    if (dbscan === 'noise' || cluster == null) color = '#bbb';
    else color = palette[Number(cluster) % palette.length];
    return { ...f, properties: { ...(f.properties ?? {}), _color: color, _dbscan: dbscan ?? 'noise' } };
  });
  const fc = turf.featureCollection(enriched);

  const { map, cleanup } = await setupMap(container, {}, fc);
  map.addSource('turf', { type: 'geojson', data: fc });
  map.addLayer({
    id: 'turf-circle',
    type: 'circle',
    source: 'turf',
    paint: {
      'circle-radius': ['match', ['get', '_dbscan'], 'core', 8, 'edge', 5, 3],
      'circle-color': ['get', '_color'],
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 1,
    },
  });
  return cleanup;
}
