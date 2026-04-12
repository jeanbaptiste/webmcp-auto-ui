// @ts-nocheck
// ---------------------------------------------------------------------------
// Route Map — display a route/path on the map
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map, mapboxgl } = await createMapboxMap(container, d);

  map.on('load', () => {
    const coordinates = d.coordinates || d.route || [];
    const lineColor = d.lineColor || '#3b82f6';
    const lineWidth = d.lineWidth ?? 4;

    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates },
      },
    });

    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': lineColor,
        'line-width': lineWidth,
        'line-opacity': d.lineOpacity ?? 0.85,
      },
    });

    // Optional waypoints
    if (d.waypoints?.length) {
      d.waypoints.forEach((wp: any, i: number) => {
        const el = document.createElement('div');
        el.style.cssText = 'width:12px;height:12px;border-radius:50%;background:#ef4444;border:2px solid #fff;';
        const marker = new mapboxgl.Marker(el).setLngLat(wp.coordinates || wp).addTo(map);
        if (wp.label) marker.setPopup(new mapboxgl.Popup().setText(wp.label));
      });
    }

    // Start/end markers
    if (coordinates.length >= 2) {
      const startEl = document.createElement('div');
      startEl.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid #fff;';
      new mapboxgl.Marker(startEl).setLngLat(coordinates[0]).addTo(map);

      const endEl = document.createElement('div');
      endEl.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff;';
      new mapboxgl.Marker(endEl).setLngLat(coordinates[coordinates.length - 1]).addTo(map);
    }

    // Fit bounds
    if (coordinates.length >= 2) {
      const bounds = new mapboxgl.LngLatBounds();
      coordinates.forEach((c: any) => bounds.extend(c));
      map.fitBounds(bounds, { padding: 50 });
    }
  });

  return () => { map.remove(); };
}
