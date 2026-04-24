// @ts-nocheck
import { createMap, whenLoaded } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center, zoom = 8, style = 'voyager', paths = [], color = '#e74c3c', width = 3 } = data as any;

  const firstCoord = paths[0]?.coords?.[0];
  const resolvedCenter = center ?? firstCoord ?? [2.3522, 48.8566];

  const { map, cleanup } = await createMap(container, { center: resolvedCenter, zoom, style });
  await whenLoaded(map);

  const features = paths.map((p: any, i: number) => ({
    type: 'Feature',
    properties: { color: p.color ?? color, width: p.width ?? width, id: i },
    geometry: { type: 'LineString', coordinates: p.coords },
  }));

  map.addSource('ln', { type: 'geojson', data: { type: 'FeatureCollection', features } });
  map.addLayer({
    id: 'ln',
    type: 'line',
    source: 'ln',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['get', 'width'],
    },
  });

  return cleanup;
}
