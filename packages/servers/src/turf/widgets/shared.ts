// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared helpers for Turf.js widgets — Turf import, MapLibre setup wrappers,
// fit-to-bounds, common color palette + empty-data hint.
// ---------------------------------------------------------------------------

import { createMap, whenLoaded } from '../../maplibre/widgets/shared.js';

let _turf: any = null;

/** Lazy-load @turf/turf (single import, cached). */
export async function loadTurf(): Promise<any> {
  if (_turf) return _turf;
  const mod = await import('@turf/turf');
  _turf = mod.default ?? mod;
  return _turf;
}

/** Color palette: input vs result vs accents. */
export const COLORS = {
  input: '#3388ff',
  result: '#e74c3c',
  accent: '#27ae60',
  warn: '#f39c12',
  neutral: '#7f8c8d',
  truthy: '#2ecc71',
  falsy: '#e74c3c',
};

/** Compute a [west, south, east, north] bbox of a FeatureCollection. */
export function fcBbox(turf: any, fc: any): number[] {
  try {
    return turf.bbox(fc);
  } catch {
    return [-180, -85, 180, 85];
  }
}

/** Fit a MapLibre map to bbox, clamping huge spans, with padding. */
export function fitToBbox(map: any, bbox: number[], padding = 40) {
  if (!bbox || bbox.length !== 4) return;
  const [w, s, e, n] = bbox;
  if (![w, s, e, n].every((v) => Number.isFinite(v))) return;
  try {
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding, duration: 0, maxZoom: 16 },
    );
  } catch {
    // ignore
  }
}

/** Build a setup helper: createMap + whenLoaded + fitToBbox if `fc` provided. */
export async function setupMap(
  container: HTMLElement,
  options: any,
  fc?: any,
): Promise<{ map: any; cleanup: () => void; turf: any }> {
  const turf = await loadTurf();
  const opts = { center: [0, 20], zoom: 2, ...(options ?? {}) };
  const { map, cleanup } = await createMap(container, opts);
  await whenLoaded(map);
  if (fc) fitToBbox(map, fcBbox(turf, fc));
  return { map, cleanup, turf };
}

/** Layer factory: add fill+line+circle layers stamped with `kind` styling. */
export function addKindLayers(
  map: any,
  sourceId: string,
  paint?: { fillOpacity?: number; circleRadius?: number; lineWidth?: number },
) {
  const fillOpacity = paint?.fillOpacity ?? 0.3;
  const circleRadius = paint?.circleRadius ?? 5;
  const lineWidth = paint?.lineWidth ?? 2;

  const colorExpr = [
    'match',
    ['coalesce', ['get', 'kind'], 'input'],
    'input', COLORS.input,
    'result', COLORS.result,
    'accent', COLORS.accent,
    'warn', COLORS.warn,
    'truthy', COLORS.truthy,
    'falsy', COLORS.falsy,
    COLORS.neutral,
  ];

  map.addLayer({
    id: `${sourceId}-fill`,
    type: 'fill',
    source: sourceId,
    filter: ['==', '$type', 'Polygon'],
    paint: { 'fill-color': colorExpr, 'fill-opacity': fillOpacity, 'fill-outline-color': colorExpr },
  });
  map.addLayer({
    id: `${sourceId}-line`,
    type: 'line',
    source: sourceId,
    filter: ['==', '$type', 'LineString'],
    paint: { 'line-color': colorExpr, 'line-width': lineWidth },
  });
  map.addLayer({
    id: `${sourceId}-poly-outline`,
    type: 'line',
    source: sourceId,
    filter: ['==', '$type', 'Polygon'],
    paint: { 'line-color': colorExpr, 'line-width': 1.5 },
  });
  map.addLayer({
    id: `${sourceId}-circle`,
    type: 'circle',
    source: sourceId,
    filter: ['==', '$type', 'Point'],
    paint: {
      'circle-radius': circleRadius,
      'circle-color': colorExpr,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff',
    },
  });
}

/** Stamp `kind` (and optional extra props) into a feature. */
export function stamp(feature: any, kind: string, extra?: Record<string, unknown>): any {
  if (!feature) return feature;
  const f = feature.type === 'Feature' ? feature : { type: 'Feature', properties: {}, geometry: feature };
  return {
    ...f,
    properties: { ...(f.properties ?? {}), kind, ...(extra ?? {}) },
  };
}

/** Coerce: normalize input → Feature (accepts Feature, FeatureCollection (first), geometry). */
export function asFeature(turf: any, input: any): any | null {
  if (!input) return null;
  if (input.type === 'Feature') return input;
  if (input.type === 'FeatureCollection') return input.features?.[0] ?? null;
  // raw geometry
  if (typeof input.type === 'string' && input.coordinates) {
    return { type: 'Feature', properties: {}, geometry: input };
  }
  return null;
}

/** Coerce: normalize input → FeatureCollection (accepts FC, Feature, array, geometry). */
export function asFeatureCollection(turf: any, input: any): any {
  if (!input) return turf.featureCollection([]);
  if (input.type === 'FeatureCollection') return input;
  if (Array.isArray(input)) {
    const feats = input
      .map((it: any) => {
        if (it?.type === 'Feature') return it;
        if (typeof it?.type === 'string' && it.coordinates)
          return { type: 'Feature', properties: {}, geometry: it };
        if (Array.isArray(it) && it.length === 2 && it.every((n) => typeof n === 'number'))
          return turf.point(it);
        return null;
      })
      .filter(Boolean);
    return turf.featureCollection(feats);
  }
  if (input.type === 'Feature') return turf.featureCollection([input]);
  if (typeof input.type === 'string' && input.coordinates) {
    return turf.featureCollection([{ type: 'Feature', properties: {}, geometry: input }]);
  }
  return turf.featureCollection([]);
}

/** Coerce a [lng,lat] or {lng,lat}/{lon,lat}/{x,y} → Point feature. */
export function asPoint(turf: any, input: any): any | null {
  if (!input) return null;
  if (input?.type === 'Feature' && input.geometry?.type === 'Point') return input;
  if (input?.type === 'Point' && Array.isArray(input.coordinates)) {
    return turf.point(input.coordinates);
  }
  if (Array.isArray(input) && input.length >= 2) return turf.point([input[0], input[1]]);
  if (typeof input === 'object') {
    const lng = input.lng ?? input.lon ?? input.longitude ?? input.x;
    const lat = input.lat ?? input.latitude ?? input.y;
    if (Number.isFinite(lng) && Number.isFinite(lat)) return turf.point([lng, lat]);
  }
  return null;
}

/**
 * Render a visible empty-data hint and return a no-op cleanup.
 */
export function renderEmpty(container: HTMLElement, widgetId: string, hint?: string): () => void {
  container.style.minHeight = container.style.minHeight || '160px';
  container.innerHTML = `
    <div style="padding:14px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — no data</strong><br>
      ${hint ?? 'Pass valid GeoJSON input (Feature, FeatureCollection, or geometry).'}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/**
 * Add a small floating label overlay (HTML) on the map — used by widgets that
 * need to display a measure (area, distance, bearing, ...).
 */
export function addLabelOverlay(container: HTMLElement, text: string): () => void {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText =
    'position:absolute;top:8px;left:8px;z-index:5;background:rgba(255,255,255,0.92);color:#222;padding:6px 10px;border-radius:6px;font-family:system-ui,sans-serif;font-size:12px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.2);pointer-events:none;';
  // ensure container is a positioning context
  const prev = container.style.position;
  if (!prev || prev === 'static') container.style.position = 'relative';
  container.appendChild(el);
  return () => {
    try {
      el.remove();
    } catch {
      // ignore
    }
  };
}
