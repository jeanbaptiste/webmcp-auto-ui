// @ts-nocheck
// ---------------------------------------------------------------------------
// Building 3D Map — Mapbox 3D buildings layer
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map } = await createMapboxMap(container, {
    ...d,
    style: d.style || 'mapbox://styles/mapbox/light-v11',
    pitch: d.pitch ?? 60,
    bearing: d.bearing ?? -20,
    zoom: d.zoom ?? 15,
    center: d.center || [-73.9857, 40.7484], // NYC by default
  });

  map.on('load', () => {
    const layers = map.getStyle().layers;
    let labelLayerId: string | undefined;
    for (const layer of layers) {
      if (layer.type === 'symbol' && layer.layout?.['text-field']) {
        labelLayerId = layer.id;
        break;
      }
    }

    map.addLayer({
      id: '3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', 'extrude', 'true'],
      type: 'fill-extrusion',
      minzoom: 12,
      paint: {
        'fill-extrusion-color': d.buildingColor || '#aaa',
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.5, ['get', 'height']],
        'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.5, ['get', 'min_height']],
        'fill-extrusion-opacity': d.opacity ?? 0.7,
      },
    }, labelLayerId);
  });

  return () => { map.remove(); };
}
