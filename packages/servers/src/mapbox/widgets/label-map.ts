// @ts-nocheck
// ---------------------------------------------------------------------------
// Label Map — display labeled points on the map
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map, mapboxgl } = await createMapboxMap(container, d);

  map.on('load', () => {
    const points = d.points || d.labels || [];
    const geojson = {
      type: 'FeatureCollection',
      features: points.map((p: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.coordinates || [p.lng || p.lon, p.lat] },
        properties: { label: p.label || p.name || '', description: p.description || '' },
      })),
    };

    map.addSource('labels', { type: 'geojson', data: geojson });

    map.addLayer({
      id: 'label-circles',
      type: 'circle',
      source: 'labels',
      paint: {
        'circle-radius': d.circleRadius ?? 6,
        'circle-color': d.circleColor || '#6366f1',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    map.addLayer({
      id: 'label-text',
      type: 'symbol',
      source: 'labels',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': d.textSize ?? 12,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-allow-overlap': d.allowOverlap ?? false,
      },
      paint: {
        'text-color': d.textColor || '#1e293b',
        'text-halo-color': '#fff',
        'text-halo-width': 1,
      },
    });

    if (points.length) {
      const bounds = new mapboxgl.LngLatBounds();
      points.forEach((p: any) => bounds.extend(p.coordinates || [p.lng || p.lon, p.lat]));
      map.fitBounds(bounds, { padding: 50 });
    }
  });

  return () => { map.remove(); };
}
