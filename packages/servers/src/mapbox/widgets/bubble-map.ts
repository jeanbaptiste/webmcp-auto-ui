// @ts-nocheck
// ---------------------------------------------------------------------------
// Bubble Map — proportionally sized circles on the map
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map, mapboxgl } = await createMapboxMap(container, d);

  map.on('load', () => {
    const points = d.points || d.bubbles || [];
    const valueProperty = d.valueProperty || 'value';
    const maxRadius = d.maxRadius ?? 40;
    const minRadius = d.minRadius ?? 5;

    const geojson = {
      type: 'FeatureCollection',
      features: points.map((p: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.coordinates || [p.lng || p.lon, p.lat] },
        properties: { value: p[valueProperty] ?? p.value ?? 1, label: p.label || p.name || '' },
      })),
    };

    map.addSource('bubbles', { type: 'geojson', data: geojson });

    const maxVal = Math.max(...points.map((p: any) => p[valueProperty] ?? p.value ?? 1), 1);

    map.addLayer({
      id: 'bubble-circles',
      type: 'circle',
      source: 'bubbles',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'value'], 0, minRadius, maxVal, maxRadius],
        'circle-color': d.color || '#6366f1',
        'circle-opacity': d.opacity ?? 0.6,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff',
      },
    });

    // Popup
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
    map.on('mousemove', 'bubble-circles', (e) => {
      if (e.features?.length) {
        const f = e.features[0];
        popup.setLngLat(e.lngLat).setHTML(`<strong>${f.properties.label}</strong><br/>${valueProperty}: ${f.properties.value}`).addTo(map);
      }
    });
    map.on('mouseleave', 'bubble-circles', () => popup.remove());

    if (points.length) {
      const bounds = new mapboxgl.LngLatBounds();
      points.forEach((p: any) => bounds.extend(p.coordinates || [p.lng || p.lon, p.lat]));
      map.fitBounds(bounds, { padding: 50 });
    }
  });

  return () => { map.remove(); };
}
