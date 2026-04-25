// @ts-nocheck
import {
  DEFAULT_PMTILES_URL,
  createPmtilesMap,
  pmtilesUrl,
  renderEmpty,
} from './shared.js';

/**
 * 3D buildings extruded from a pmtiles archive whose vector schema includes
 * a `buildings` layer with a numeric `height` (or `render_height`) property.
 */
export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const {
    url = DEFAULT_PMTILES_URL,
    center = [-74.006, 40.7128],
    zoom = 15,
    pitch = 60,
    bearing = -20,
    heightProp = 'height',
    color = '#bdb6a8',
    opacity = 0.85,
  } = data as any;

  if (!url) return renderEmpty(container, 'protomaps-buildings-3d');

  const style = {
    version: 8,
    sources: {
      protomaps: { type: 'vector', url: pmtilesUrl(url) },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#efeee8' } },
      {
        id: 'earth',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'earth',
        paint: { 'fill-color': '#e0e0d8' },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'water',
        paint: { 'fill-color': '#9bd3e0' },
      },
      {
        id: 'roads',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        paint: { 'line-color': '#fff', 'line-width': 1 },
      },
      {
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'protomaps',
        'source-layer': 'buildings',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': color,
          'fill-extrusion-height': [
            'coalesce',
            ['to-number', ['get', heightProp]],
            ['to-number', ['get', 'render_height']],
            6,
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': opacity,
        },
      },
    ],
  };

  const { cleanup } = await createPmtilesMap(container, {
    style,
    center,
    zoom,
    pitch,
    bearing,
  });
  return cleanup;
}
