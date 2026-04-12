// @ts-nocheck
// ---------------------------------------------------------------------------
// Terrain Map — 3D terrain with hillshade
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map } = await createMapboxMap(container, {
    ...d,
    style: d.style || 'mapbox://styles/mapbox/outdoors-v12',
    pitch: d.pitch ?? 60,
    zoom: d.zoom ?? 12,
    center: d.center || [6.8652, 45.8326], // Mont Blanc area
  });

  map.on('load', () => {
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });

    map.setTerrain({ source: 'mapbox-dem', exaggeration: d.exaggeration ?? 1.5 });

    map.addLayer({
      id: 'hillshade',
      source: 'mapbox-dem',
      type: 'hillshade',
      paint: {
        'hillshade-shadow-color': '#473B24',
        'hillshade-illumination-anchor': 'viewport',
      },
    }, 'land-structure-polygon');
  });

  return () => { map.remove(); };
}
