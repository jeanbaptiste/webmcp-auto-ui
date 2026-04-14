// @ts-nocheck
// ---------------------------------------------------------------------------
// Choropleth Map — colored regions by data values
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map, mapboxgl } = await createMapboxMap(container, d);

  map.on('load', () => {
    const geojson = d.geojson || {
      type: 'FeatureCollection',
      features: d.features || [],
    };

    const property = d.property || 'value';
    const colors = d.colors || ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594'];
    const stops = d.stops || [0, 10, 20, 30, 40, 50, 75, 100];

    map.addSource('choropleth', {
      type: 'geojson',
      data: geojson,
    });

    const fillColor: any[] = ['interpolate', ['linear'], ['get', property]];
    for (let i = 0; i < Math.min(stops.length, colors.length); i++) {
      fillColor.push(stops[i], colors[i]);
    }

    map.addLayer({
      id: 'choropleth-fill',
      type: 'fill',
      source: 'choropleth',
      paint: {
        'fill-color': fillColor,
        'fill-opacity': d.fillOpacity ?? 0.7,
      },
    });

    map.addLayer({
      id: 'choropleth-outline',
      type: 'line',
      source: 'choropleth',
      paint: {
        'line-color': d.outlineColor || '#333',
        'line-width': d.outlineWidth ?? 1,
      },
    });

    // Popup on click
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
    map.on('mousemove', 'choropleth-fill', (e) => {
      if (e.features?.length) {
        const f = e.features[0];
        const val = f.properties[property];
        const name = f.properties[d.nameProperty || 'name'] || '';
        popup.setLngLat(e.lngLat).setHTML(`<strong>${name}</strong><br/>${property}: ${val}`).addTo(map);
        map.getCanvas().style.cursor = 'pointer';
      }
    });
    map.on('mouseleave', 'choropleth-fill', () => {
      popup.remove();
      map.getCanvas().style.cursor = '';
    });

    if (d.fitBounds && geojson.features?.length) {
      const bounds = new mapboxgl.LngLatBounds();
      geojson.features.forEach((f: any) => {
        const coords = f.geometry?.coordinates;
        if (coords) flattenCoords(coords).forEach((c: any) => bounds.extend(c));
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40 });
    }
  });

  return () => { map.remove(); };
}

function flattenCoords(coords: any): any[] {
  if (typeof coords[0] === 'number') return [coords];
  return coords.flatMap(flattenCoords);
}
