// @ts-nocheck
// ---------------------------------------------------------------------------
// Animated Line Map — line that draws progressively on the map
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map, mapboxgl } = await createMapboxMap(container, d);
  let animId: number | null = null;

  map.on('load', () => {
    const coordinates = d.coordinates || d.path || [];
    const lineColor = d.lineColor || '#f97316';
    const lineWidth = d.lineWidth ?? 3;
    const duration = d.duration ?? 3000;

    const geojson: any = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [] },
    };

    map.addSource('animated-line', { type: 'geojson', data: geojson });

    map.addLayer({
      id: 'animated-line-layer',
      type: 'line',
      source: 'animated-line',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': lineColor,
        'line-width': lineWidth,
        'line-opacity': 0.9,
      },
    });

    // Animate
    const totalPoints = coordinates.length;
    if (totalPoints < 2) return;

    const startTime = performance.now();
    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const idx = Math.floor(progress * (totalPoints - 1)) + 1;

      geojson.geometry.coordinates = coordinates.slice(0, idx);
      map.getSource('animated-line')?.setData(geojson);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    }

    // Fit bounds first
    const bounds = new mapboxgl.LngLatBounds();
    coordinates.forEach((c: any) => bounds.extend(c));
    map.fitBounds(bounds, { padding: 50 });

    setTimeout(() => { animId = requestAnimationFrame(animate); }, 500);
  });

  return () => {
    if (animId) cancelAnimationFrame(animId);
    map.remove();
  };
}
