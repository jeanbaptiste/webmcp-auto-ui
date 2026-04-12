// @ts-nocheck
// ---------------------------------------------------------------------------
// Heat Map — density heatmap layer
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map } = await createMapboxMap(container, { ...d, style: d.style || 'mapbox://styles/mapbox/dark-v11' });

  map.on('load', () => {
    const points = d.points || [];
    const geojson = {
      type: 'FeatureCollection',
      features: points.map((p: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.coordinates || [p.lng || p.lon, p.lat] },
        properties: { weight: p.weight ?? p.intensity ?? 1 },
      })),
    };

    map.addSource('heat', { type: 'geojson', data: geojson });

    map.addLayer({
      id: 'heat-layer',
      type: 'heatmap',
      source: 'heat',
      paint: {
        'heatmap-weight': ['get', 'weight'],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, d.radius ?? 15, 9, (d.radius ?? 15) * 2],
        'heatmap-opacity': d.opacity ?? 0.8,
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.2, d.colorLow || '#2c7fb8',
          0.4, '#7fcdbb',
          0.6, '#edf8b1',
          0.8, '#fec44f',
          1.0, d.colorHigh || '#d95f0e',
        ],
      },
    });
  });

  return () => { map.remove(); };
}
