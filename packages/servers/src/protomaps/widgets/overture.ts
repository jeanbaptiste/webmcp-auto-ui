// @ts-nocheck
import {
  OVERTURE_PMTILES_URL,
  createPmtilesMap,
  pmtilesUrl,
  renderEmpty,
} from './shared.js';

/**
 * Overture Maps tiles via pmtiles. Schema layers differ from the Protomaps
 * basemaps schema, so we render a generic style that surfaces the most
 * common Overture themes (`places`, `transportation`, `buildings`, `base`).
 * Pass `sourceLayer` + `layerType` for a single-layer focused view.
 */
export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const {
    url = OVERTURE_PMTILES_URL,
    center = [-100, 40],
    zoom = 3,
    sourceLayer,
    layerType = 'circle',
    paint,
  } = data as any;

  if (!url) return renderEmpty(container, 'protomaps-overture');

  const layers: any[] = [
    { id: 'background', type: 'background', paint: { 'background-color': '#f5f4f0' } },
  ];

  if (sourceLayer) {
    const defaultPaint =
      layerType === 'fill'
        ? { 'fill-color': '#3388ff', 'fill-opacity': 0.4 }
        : layerType === 'line'
        ? { 'line-color': '#3388ff', 'line-width': 1.2 }
        : { 'circle-color': '#e74c3c', 'circle-radius': 3, 'circle-opacity': 0.7 };
    layers.push({
      id: 'overture-layer',
      type: layerType,
      source: 'overture',
      'source-layer': sourceLayer,
      paint: { ...defaultPaint, ...(paint ?? {}) },
    });
  } else {
    // Best-effort multi-layer rendering against common Overture schemas
    layers.push(
      { id: 'ov-base', type: 'fill', source: 'overture', 'source-layer': 'base', paint: { 'fill-color': '#e0e0d8' } },
      { id: 'ov-buildings', type: 'fill', source: 'overture', 'source-layer': 'buildings', paint: { 'fill-color': '#dad7c8' } },
      { id: 'ov-transportation', type: 'line', source: 'overture', 'source-layer': 'transportation', paint: { 'line-color': '#888', 'line-width': 0.8 } },
      { id: 'ov-places', type: 'circle', source: 'overture', 'source-layer': 'places', paint: { 'circle-color': '#e74c3c', 'circle-radius': 2.5, 'circle-opacity': 0.7 } },
    );
  }

  const style = {
    version: 8,
    sources: {
      overture: {
        type: 'vector',
        url: pmtilesUrl(url),
        attribution: '© <a href="https://overturemaps.org">Overture Maps Foundation</a>',
      },
    },
    layers,
  };

  const { cleanup } = await createPmtilesMap(container, { style, center, zoom });
  return cleanup;
}
