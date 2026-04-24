// @ts-nocheck
import { createMap, whenLoaded } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [2.3522, 48.8566], zoom = 3, style = 'positron', points = [], clusterRadius = 50 } = data as any;
  const { map, cleanup } = await createMap(container, { center, zoom, style });
  await whenLoaded(map);

  const features = points.map((p: any) => ({
    type: 'Feature',
    properties: { ...(p.properties ?? {}) },
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
  }));

  map.addSource('cl', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius,
  });

  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'cl',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 50, '#f1f075', 200, '#f28cb1'],
      'circle-radius': ['step', ['get', 'point_count'], 15, 50, 22, 200, 30],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  });

  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'cl',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 12,
    },
    paint: { 'text-color': '#000' },
  });

  map.addLayer({
    id: 'unclustered',
    type: 'circle',
    source: 'cl',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#11b4da',
      'circle-radius': 5,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff',
    },
  });

  return cleanup;
}
