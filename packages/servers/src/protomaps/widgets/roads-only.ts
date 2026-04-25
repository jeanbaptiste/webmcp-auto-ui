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
    center = [2.3522, 48.8566],
    zoom = 11,
    color = '#222',
    background = '#fff',
  } = data as any;

  if (!url) return renderEmpty(container, 'protomaps-roads-only');

  const style = {
    version: 8,
    sources: {
      protomaps: { type: 'vector', url: pmtilesUrl(url) },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': background } },
      {
        id: 'roads-casing',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        paint: {
          'line-color': background,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 16, 8],
        },
      },
      {
        id: 'roads',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        paint: {
          'line-color': color,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.3, 16, 4],
        },
      },
    ],
  };

  const { cleanup } = await createPmtilesMap(container, { style, center, zoom });
  return cleanup;
}
