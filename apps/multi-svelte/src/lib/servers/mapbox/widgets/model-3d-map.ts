// @ts-nocheck
// ---------------------------------------------------------------------------
// Model 3D Map — place a 3D model on the map using custom layer
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map, mapboxgl } = await createMapboxMap(container, {
    ...d,
    style: d.style || 'mapbox://styles/mapbox/light-v11',
    pitch: d.pitch ?? 60,
    zoom: d.zoom ?? 16,
    center: d.center || [2.2945, 48.8584],
  });

  map.on('load', () => {
    // Since loading actual 3D models requires Three.js integration,
    // we simulate with an extruded polygon representing the model footprint
    const modelCenter = d.modelCenter || d.center || [2.2945, 48.8584];
    const modelSize = d.modelSize ?? 0.001;
    const modelHeight = d.modelHeight ?? 100;

    const ring = [
      [modelCenter[0] - modelSize, modelCenter[1] - modelSize],
      [modelCenter[0] + modelSize, modelCenter[1] - modelSize],
      [modelCenter[0] + modelSize, modelCenter[1] + modelSize],
      [modelCenter[0] - modelSize, modelCenter[1] + modelSize],
      [modelCenter[0] - modelSize, modelCenter[1] - modelSize],
    ];

    map.addSource('model-footprint', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: { height: modelHeight },
        geometry: { type: 'Polygon', coordinates: [ring] },
      },
    });

    map.addLayer({
      id: 'model-extrusion',
      type: 'fill-extrusion',
      source: 'model-footprint',
      paint: {
        'fill-extrusion-color': d.modelColor || '#6366f1',
        'fill-extrusion-height': modelHeight,
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': d.opacity ?? 0.85,
      },
    });

    // Label
    if (d.label) {
      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat(modelCenter)
        .setPopup(new mapboxgl.Popup().setText(d.label))
        .addTo(map);
    }
  });

  return () => { map.remove(); };
}
