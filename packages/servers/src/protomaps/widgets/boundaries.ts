// @ts-nocheck
import {
  DEFAULT_PMTILES_URL,
  createPmtilesMap,
  pmtilesUrl,
  renderEmpty,
} from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const {
    url = DEFAULT_PMTILES_URL,
    center = [10, 50],
    zoom = 3,
    color = '#444',
    background = '#f7f7f4',
  } = data as any;

  if (!url) return renderEmpty(container, 'protomaps-boundaries');

  const style = {
    version: 8,
    sources: {
      protomaps: { type: 'vector', url: pmtilesUrl(url) },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': background } },
      {
        id: 'earth',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'earth',
        paint: { 'fill-color': '#ecebe5' },
      },
      {
        id: 'boundaries',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'boundaries',
        paint: {
          'line-color': color,
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 10, 2],
          'line-dasharray': [2, 2],
        },
      },
    ],
  };

  const { cleanup } = await createPmtilesMap(container, { style, center, zoom });
  return cleanup;
}
