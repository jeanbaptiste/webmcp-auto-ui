// @ts-nocheck
// ---------------------------------------------------------------------------
// Globe Map — globe projection with atmosphere
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map, mapboxgl } = await createMapboxMap(container, {
    ...d,
    style: d.style || 'mapbox://styles/mapbox/satellite-v9',
    projection: 'globe',
    zoom: d.zoom ?? 1.5,
    center: d.center || [0, 20],
  });

  map.on('load', () => {
    map.setFog({
      color: d.fogColor || 'rgb(186, 210, 235)',
      'high-color': d.fogHighColor || 'rgb(36, 92, 223)',
      'horizon-blend': d.horizonBlend ?? 0.02,
      'space-color': d.spaceColor || 'rgb(11, 11, 25)',
      'star-intensity': d.starIntensity ?? 0.6,
    });

    // Optional markers
    if (d.markers?.length) {
      d.markers.forEach((m: any) => {
        const marker = new mapboxgl.Marker({ color: m.color || '#ef4444' })
          .setLngLat(m.coordinates || [m.lng || m.lon, m.lat])
          .addTo(map);
        if (m.label) marker.setPopup(new mapboxgl.Popup().setText(m.label));
      });
    }

    // Optional auto-rotation
    if (d.rotate !== false) {
      let running = true;
      function spin() {
        if (!running) return;
        const center = map.getCenter();
        center.lng += 0.2;
        map.easeTo({ center, duration: 50, easing: (t) => t });
        requestAnimationFrame(spin);
      }
      spin();
      map.on('mousedown', () => { running = false; });
      map.on('mouseup', () => { running = true; spin(); });
    }
  });

  return () => { map.remove(); };
}
