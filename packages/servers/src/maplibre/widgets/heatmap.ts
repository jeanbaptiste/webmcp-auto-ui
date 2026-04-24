// @ts-nocheck
import { createMap, whenLoaded } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [2.3522, 48.8566], zoom = 10, style = 'dark', points = [], radius = 20, intensity = 1 } = data as any;
  const { map, cleanup } = await createMap(container, { center, zoom, style });
  await whenLoaded(map);

  const features = points.map((p: any) => ({
    type: 'Feature',
    properties: { weight: p.weight ?? 1 },
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
  }));

  map.addSource('hm', { type: 'geojson', data: { type: 'FeatureCollection', features } });
  map.addLayer({
    id: 'hm',
    type: 'heatmap',
    source: 'hm',
    paint: {
      'heatmap-weight': ['get', 'weight'],
      'heatmap-intensity': intensity,
      'heatmap-radius': radius,
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,255,0)',
        0.2, 'royalblue',
        0.4, 'cyan',
        0.6, 'lime',
        0.8, 'yellow',
        1, 'red',
      ],
      'heatmap-opacity': 0.8,
    },
  });

  return cleanup;
}
