// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared helpers for H3 widgets — geometry conversion + color ramps + empty
// ---------------------------------------------------------------------------

import * as h3 from 'h3-js';

/**
 * Convert an H3 cell to a GeoJSON Polygon Feature.
 * `cellToBoundary(cell, true)` returns [lng, lat] pairs (GeoJSON order).
 * The boundary is closed by appending the first vertex at the end.
 */
export function cellToFeature(cell: string, properties: Record<string, unknown> = {}): any {
  const ring = h3.cellToBoundary(cell, true);
  if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
    ring.push(ring[0]);
  }
  return {
    type: 'Feature',
    properties: { id: cell, ...properties },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

/** Build a FeatureCollection from a list of H3 cells. */
export function cellsToFeatureCollection(
  cells: string[],
  propsFor?: (cell: string, idx: number) => Record<string, unknown>,
): any {
  return {
    type: 'FeatureCollection',
    features: cells.map((c, i) => cellToFeature(c, propsFor ? propsFor(c, i) : {})),
  };
}

/** Convert two H3 cells (origin → destination) to a LineString feature. */
export function edgeToLineFeature(edge: string): any {
  const coords = h3.directedEdgeToBoundary(edge, true);
  return {
    type: 'Feature',
    properties: { id: edge },
    geometry: { type: 'LineString', coordinates: coords },
  };
}

/** Centroid [lng, lat] of an H3 cell (GeoJSON order). */
export function cellCenter(cell: string): [number, number] {
  const [lat, lng] = h3.cellToLatLng(cell);
  return [lng, lat];
}

/**
 * Default sequential viridis-ish ramp (works on light + dark basemaps).
 */
export const DEFAULT_RAMP = ['#440154', '#3b528b', '#21908c', '#5dc863', '#fde725'];

/**
 * Build a MapLibre `interpolate` expression on a numeric property.
 */
export function rampExpression(property: string, min: number, max: number, ramp = DEFAULT_RAMP): any {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return ramp[Math.floor(ramp.length / 2)];
  }
  const stops: any[] = [];
  for (let i = 0; i < ramp.length; i++) {
    const v = min + (i / (ramp.length - 1)) * (max - min);
    stops.push(v, ramp[i]);
  }
  return ['interpolate', ['linear'], ['to-number', ['get', property]], ...stops];
}

/**
 * Render a visible "no data" hint inside `container`.
 */
export function renderEmpty(container: HTMLElement, widgetId: string, hint?: string): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — no data</strong><br>
      ${hint ?? 'Pass valid H3 parameters (lat/lng + resolution, or a list of cells).'}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/**
 * Compute centroid of a list of H3 cells. Falls back to [0, 0] if empty.
 */
export function cellsCentroid(cells: string[]): [number, number] {
  if (!cells.length) return [0, 0];
  let sx = 0;
  let sy = 0;
  for (const c of cells) {
    const [lat, lng] = h3.cellToLatLng(c);
    sx += lng;
    sy += lat;
  }
  return [sx / cells.length, sy / cells.length];
}

/**
 * Best-effort safe wrapper for h3 calls that can throw on invalid input.
 */
export function tryH3<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
