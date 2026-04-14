// @ts-nocheck
// ---------------------------------------------------------------------------
// Satellite Map — satellite imagery with optional labels
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const style = d.labels !== false
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/satellite-v9';

  const { map, mapboxgl } = await createMapboxMap(container, { ...d, style });

  map.on('load', () => {
    // Optional markers
    if (d.markers?.length) {
      d.markers.forEach((m: any) => {
        const marker = new mapboxgl.Marker({ color: m.color || '#ef4444' })
          .setLngLat(m.coordinates || [m.lng || m.lon, m.lat])
          .addTo(map);
        if (m.label) marker.setPopup(new mapboxgl.Popup().setText(m.label));
      });
    }

    // Optional polygon overlay
    if (d.polygon) {
      map.addSource('sat-polygon', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: d.polygon } },
      });
      map.addLayer({
        id: 'sat-polygon-fill',
        type: 'fill',
        source: 'sat-polygon',
        paint: { 'fill-color': d.polygonColor || '#3b82f6', 'fill-opacity': 0.3 },
      });
      map.addLayer({
        id: 'sat-polygon-line',
        type: 'line',
        source: 'sat-polygon',
        paint: { 'line-color': d.polygonColor || '#3b82f6', 'line-width': 2 },
      });
    }
  });

  return () => { map.remove(); };
}
