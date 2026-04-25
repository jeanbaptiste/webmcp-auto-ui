// @ts-nocheck
import {
  DEFAULT_PMTILES_URL,
  createPmtilesMap,
  renderEmpty,
  themedStyle,
  whenLoaded,
} from './shared.js';

/**
 * Protomaps basemap + arbitrary GeoJSON overlay drawn on top.
 *
 * Inputs:
 *   - url           : pmtiles HTTPS URL (defaults to public demo)
 *   - theme         : 'light' | 'dark' | 'grayscale' | 'white' | 'black'
 *   - geojson       : FeatureCollection or Feature
 *   - overlayType   : 'fill' | 'line' | 'circle' (default: auto from geometry)
 *   - paint         : MapLibre paint overrides for the overlay layer
 *   - center, zoom  : initial view
 */
export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const {
    url = DEFAULT_PMTILES_URL,
    theme = 'light',
    geojson,
    overlayType,
    paint,
    center = [0, 20],
    zoom = 2,
  } = data as any;

  if (!url) return renderEmpty(container, 'protomaps-with-overlay');
  if (!geojson) {
    return renderEmpty(
      container,
      'protomaps-with-overlay',
      'Pass <code>geojson</code> (FeatureCollection or Feature) to overlay on the basemap.',
    );
  }

  // Auto-detect a reasonable overlay layer type
  const features = Array.isArray(geojson?.features)
    ? geojson.features
    : geojson?.type === 'Feature'
    ? [geojson]
    : [];
  const firstGeom = features[0]?.geometry?.type ?? '';
  const inferredType =
    overlayType ??
    (/Polygon/i.test(firstGeom)
      ? 'fill'
      : /Line/i.test(firstGeom)
      ? 'line'
      : 'circle');

  const defaultPaint =
    inferredType === 'fill'
      ? { 'fill-color': '#e74c3c', 'fill-opacity': 0.45, 'fill-outline-color': '#a52714' }
      : inferredType === 'line'
      ? { 'line-color': '#e74c3c', 'line-width': 2 }
      : { 'circle-color': '#e74c3c', 'circle-radius': 5, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 };

  const style = themedStyle(url, theme);
  const { map, cleanup } = await createPmtilesMap(container, { style, center, zoom });

  await whenLoaded(map);
  try {
    map.addSource('overlay', { type: 'geojson', data: geojson });
    map.addLayer({
      id: 'overlay-layer',
      type: inferredType,
      source: 'overlay',
      paint: { ...defaultPaint, ...(paint ?? {}) },
    });
  } catch {
    // map could be torn down between load and addSource — ignore
  }

  return cleanup;
}
