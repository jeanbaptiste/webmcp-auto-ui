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
    center = [0, 20],
    zoom = 1.5,
    waterColor = '#1f5d8a',
    landColor = '#f3efe4',
  } = data as any;

  if (!url) return renderEmpty(container, 'protomaps-water');

  const style = {
    version: 8,
    sources: {
      protomaps: { type: 'vector', url: pmtilesUrl(url) },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': landColor } },
      {
        id: 'water',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'water',
        paint: { 'fill-color': waterColor },
      },
    ],
  };

  const { cleanup } = await createPmtilesMap(container, { style, center, zoom });
  return cleanup;
}
