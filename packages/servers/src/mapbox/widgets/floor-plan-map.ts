// @ts-nocheck
// ---------------------------------------------------------------------------
// Floor Plan Map — indoor floor plan overlay on map
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map, mapboxgl } = await createMapboxMap(container, {
    ...d,
    zoom: d.zoom ?? 18,
    center: d.center || [2.3522, 48.8566],
  });

  map.on('load', () => {
    // Rooms as polygons
    const rooms = d.rooms || d.spaces || [];
    const geojson = {
      type: 'FeatureCollection',
      features: rooms.map((r: any, i: number) => ({
        type: 'Feature',
        properties: {
          name: r.name || `Room ${i + 1}`,
          color: r.color || '#6366f1',
          type: r.type || 'room',
        },
        geometry: { type: 'Polygon', coordinates: r.coordinates || r.polygon },
      })),
    };

    map.addSource('floor-plan', { type: 'geojson', data: geojson });

    map.addLayer({
      id: 'floor-fill',
      type: 'fill',
      source: 'floor-plan',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': d.fillOpacity ?? 0.4,
      },
    });

    map.addLayer({
      id: 'floor-outline',
      type: 'line',
      source: 'floor-plan',
      paint: {
        'line-color': '#333',
        'line-width': 2,
      },
    });

    map.addLayer({
      id: 'floor-labels',
      type: 'symbol',
      source: 'floor-plan',
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#1e293b',
        'text-halo-color': '#fff',
        'text-halo-width': 1,
      },
    });

    // Optional image overlay
    if (d.imageUrl && d.imageBounds) {
      map.addSource('floor-image', {
        type: 'image',
        url: d.imageUrl,
        coordinates: d.imageBounds,
      });
      map.addLayer({
        id: 'floor-image-layer',
        type: 'raster',
        source: 'floor-image',
        paint: { 'raster-opacity': d.imageOpacity ?? 0.7 },
      }, 'floor-fill');
    }
  });

  return () => { map.remove(); };
}
