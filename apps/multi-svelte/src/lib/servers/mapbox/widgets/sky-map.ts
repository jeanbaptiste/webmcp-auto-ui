// @ts-nocheck
// ---------------------------------------------------------------------------
// Sky Map — sky layer with sun position and atmosphere
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map } = await createMapboxMap(container, {
    ...d,
    style: d.style || 'mapbox://styles/mapbox/light-v11',
    pitch: d.pitch ?? 70,
    zoom: d.zoom ?? 14,
    center: d.center || [2.2945, 48.8584], // Eiffel Tower
  });

  map.on('load', () => {
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
    });
    map.setTerrain({ source: 'mapbox-dem', exaggeration: d.exaggeration ?? 1.0 });

    map.addLayer({
      id: 'sky',
      type: 'sky',
      paint: {
        'sky-type': d.skyType || 'atmosphere',
        'sky-atmosphere-sun': d.sunPosition || [0, 75],
        'sky-atmosphere-sun-intensity': d.sunIntensity ?? 5,
        'sky-atmosphere-color': d.atmosphereColor || 'rgba(135, 206, 235, 1)',
        'sky-atmosphere-halo-color': d.haloColor || 'rgba(255, 200, 100, 1)',
        'sky-opacity': [
          'interpolate', ['linear'], ['zoom'],
          0, 0, 5, 0.3, 8, 1,
        ],
      },
    });
  });

  return () => { map.remove(); };
}
