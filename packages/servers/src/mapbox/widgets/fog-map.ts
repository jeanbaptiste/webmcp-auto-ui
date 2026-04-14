// @ts-nocheck
// ---------------------------------------------------------------------------
// Fog Map — atmospheric fog and haze effects
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map } = await createMapboxMap(container, {
    ...d,
    style: d.style || 'mapbox://styles/mapbox/outdoors-v12',
    pitch: d.pitch ?? 60,
    zoom: d.zoom ?? 13,
    center: d.center || [-122.4194, 37.7749], // San Francisco
  });

  map.on('load', () => {
    map.setFog({
      range: d.range || [0.5, 10],
      color: d.fogColor || 'rgba(255, 255, 255, 0.8)',
      'high-color': d.highColor || '#add8e6',
      'horizon-blend': d.horizonBlend ?? 0.1,
      'space-color': d.spaceColor || '#d8f2ff',
      'star-intensity': d.starIntensity ?? 0,
    });

    // Optional terrain for effect
    if (d.terrain !== false) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: d.exaggeration ?? 1.2 });
    }
  });

  return () => { map.remove(); };
}
