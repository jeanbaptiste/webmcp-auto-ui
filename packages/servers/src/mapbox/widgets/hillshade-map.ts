// @ts-nocheck
// ---------------------------------------------------------------------------
// Hillshade Map — relief shading without 3D terrain
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map } = await createMapboxMap(container, {
    ...d,
    style: d.style || 'mapbox://styles/mapbox/light-v11',
    zoom: d.zoom ?? 10,
    center: d.center || [7.36, 46.49], // Swiss Alps
  });

  map.on('load', () => {
    map.addSource('dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
    });

    map.addLayer({
      id: 'hillshade-layer',
      type: 'hillshade',
      source: 'dem',
      paint: {
        'hillshade-exaggeration': d.exaggeration ?? 0.5,
        'hillshade-shadow-color': d.shadowColor || '#473B24',
        'hillshade-highlight-color': d.highlightColor || '#fff',
        'hillshade-accent-color': d.accentColor || '#000',
        'hillshade-illumination-direction': d.illuminationDirection ?? 315,
      },
    }, 'land-structure-polygon');
  });

  return () => { map.remove(); };
}
