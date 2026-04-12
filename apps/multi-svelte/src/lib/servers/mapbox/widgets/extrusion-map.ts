// @ts-nocheck
// ---------------------------------------------------------------------------
// Extrusion Map — 3D extruded polygons based on data values
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map } = await createMapboxMap(container, { ...d, pitch: d.pitch ?? 45, bearing: d.bearing ?? -17 });

  map.on('load', () => {
    const geojson = d.geojson || { type: 'FeatureCollection', features: d.features || [] };
    const heightProperty = d.heightProperty || 'height';
    const maxHeight = d.maxHeight ?? 500;
    const colorProperty = d.colorProperty || heightProperty;

    map.addSource('extrusion', { type: 'geojson', data: geojson });

    map.addLayer({
      id: 'extrusion-layer',
      type: 'fill-extrusion',
      source: 'extrusion',
      paint: {
        'fill-extrusion-color': [
          'interpolate', ['linear'], ['get', colorProperty],
          0, d.colorLow || '#ffffcc',
          maxHeight * 0.5, d.colorMid || '#fd8d3c',
          maxHeight, d.colorHigh || '#800026',
        ],
        'fill-extrusion-height': ['get', heightProperty],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': d.opacity ?? 0.8,
      },
    });
  });

  return () => { map.remove(); };
}
