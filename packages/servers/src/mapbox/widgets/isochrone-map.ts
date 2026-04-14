// @ts-nocheck
// ---------------------------------------------------------------------------
// Isochrone Map — travel time zones visualization
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map, mapboxgl } = await createMapboxMap(container, {
    ...d,
    zoom: d.zoom ?? 12,
    center: d.center || [2.3522, 48.8566],
  });

  map.on('load', () => {
    // Isochrones as concentric polygons (from outer to inner)
    const zones = d.zones || d.isochrones || generateSampleIsochrones(d.center || [2.3522, 48.8566]);
    const colors = d.colors || ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'];

    zones.forEach((zone: any, i: number) => {
      const sourceId = `isochrone-${i}`;
      const geojson = zone.geojson || {
        type: 'Feature',
        properties: { minutes: zone.minutes || (i + 1) * 5 },
        geometry: { type: 'Polygon', coordinates: zone.coordinates || zone.polygon },
      };

      map.addSource(sourceId, { type: 'geojson', data: geojson });

      map.addLayer({
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': zone.color || colors[i % colors.length],
          'fill-opacity': d.fillOpacity ?? 0.4,
        },
      });

      map.addLayer({
        id: `${sourceId}-outline`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': zone.color || colors[i % colors.length],
          'line-width': 2,
          'line-opacity': 0.8,
        },
      });
    });

    // Center marker
    const center = d.center || [2.3522, 48.8566];
    new mapboxgl.Marker({ color: '#1e293b' }).setLngLat(center).addTo(map);

    // Legend
    if (d.showLegend !== false && zones.length) {
      const legend = document.createElement('div');
      legend.style.cssText = 'position:absolute;bottom:8px;left:8px;background:rgba(255,255,255,0.9);padding:8px;border-radius:6px;font-size:11px;';
      zones.forEach((z: any, i: number) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:4px;margin:2px 0;';
        const swatch = document.createElement('span');
        swatch.style.cssText = `width:12px;height:12px;border-radius:2px;background:${z.color || colors[i % colors.length]};display:inline-block;`;
        row.appendChild(swatch);
        row.appendChild(document.createTextNode(`${z.minutes || (i + 1) * 5} min`));
        legend.appendChild(row);
      });
      container.style.position = 'relative';
      container.appendChild(legend);
    }
  });

  return () => { map.remove(); };
}

function generateSampleIsochrones(center: [number, number]) {
  const zones = [];
  for (let i = 3; i >= 1; i--) {
    const r = i * 0.015;
    const ring = [];
    for (let a = 0; a <= 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      ring.push([center[0] + Math.cos(rad) * r, center[1] + Math.sin(rad) * r * 0.7]);
    }
    zones.push({ minutes: i * 10, coordinates: [ring] });
  }
  return zones;
}
