// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared helpers for S2 widgets — cell → GeoJSON polygon, color ramps, empty
// ---------------------------------------------------------------------------

let _s2: any = null;

/** Lazy-load s2js (single import, cached). */
export async function loadS2(): Promise<any> {
  if (_s2) return _s2;
  const mod: any = await import('s2js');
  _s2 = mod;
  return _s2;
}

const RAD2DEG = 180 / Math.PI;

/** Convert an s2 Point (3-vector on unit sphere) to [lng, lat] in degrees. */
function pointToLngLat(s2: any, p: any): [number, number] {
  const ll = s2.s2.LatLng.fromPoint(p);
  // ll.lat / ll.lng are radians (Angle = number)
  return [ll.lng * RAD2DEG, ll.lat * RAD2DEG];
}

/**
 * Convert an S2 CellID (bigint) into a GeoJSON Polygon Feature.
 * Builds 4 vertices in CCW order, closes ring.
 */
export function cellIdToFeature(
  s2: any,
  cellId: any,
  properties: Record<string, unknown> = {},
): any {
  try {
    const cell = s2.s2.Cell.fromCellID(cellId);
    const ring: [number, number][] = [];
    for (let k = 0; k < 4; k++) {
      const v = cell.vertex(k);
      ring.push(pointToLngLat(s2, v));
    }
    ring.push(ring[0]); // close
    return {
      type: 'Feature',
      properties: {
        token: s2.s2.cellid.toToken(cellId),
        level: s2.s2.cellid.level(cellId),
        ...properties,
      },
      geometry: { type: 'Polygon', coordinates: [ring] },
    };
  } catch (e) {
    return null;
  }
}

/** Build a FeatureCollection from a list of S2 CellIDs (bigints). */
export function cellIdsToFeatureCollection(
  s2: any,
  cellIds: any[],
  propsFor?: (id: any, idx: number) => Record<string, unknown>,
): any {
  const features: any[] = [];
  for (let i = 0; i < cellIds.length; i++) {
    const f = cellIdToFeature(s2, cellIds[i], propsFor ? propsFor(cellIds[i], i) : {});
    if (f) features.push(f);
  }
  return { type: 'FeatureCollection', features };
}

/** Center [lng, lat] of an S2 cell. */
export function cellCenter(s2: any, cellId: any): [number, number] {
  const ll = s2.s2.cellid.latLng(cellId);
  return [ll.lng * RAD2DEG, ll.lat * RAD2DEG];
}

/**
 * Resolve an arbitrary cell-id input (bigint, decimal string, hex token,
 * or "1/3210" string form) into a CellID bigint.
 */
export function resolveCellId(s2: any, input: any): any {
  if (typeof input === 'bigint') return input;
  if (typeof input === 'number') return BigInt(input);
  if (typeof input === 'string') {
    const s = input.trim();
    if (s.includes('/')) {
      try {
        return s2.s2.cellid.fromString(s);
      } catch {
        // fall through
      }
    }
    if (/^[0-9a-fA-F]+$/.test(s) && !/^\d+$/.test(s)) {
      try {
        return s2.s2.cellid.fromToken(s);
      } catch {
        // fall through
      }
    }
    if (/^\d+$/.test(s)) {
      try {
        return BigInt(s);
      } catch {
        // fall through
      }
    }
    // last-ditch: token
    try {
      return s2.s2.cellid.fromToken(s);
    } catch {
      return null;
    }
  }
  return null;
}

/** Build a CellID for a (lat, lng) pair at a given level. */
export function latLngToCellId(s2: any, lat: number, lng: number, level: number): any {
  const ll = s2.s2.LatLng.fromDegrees(lat, lng);
  let id = s2.s2.cellid.fromLatLng(ll);
  if (level >= 0 && level < 30) id = s2.s2.cellid.parent(id, level);
  return id;
}

/** Default sequential viridis-ish ramp. */
export const DEFAULT_RAMP = ['#440154', '#3b528b', '#21908c', '#5dc863', '#fde725'];

/** Build a MapLibre `interpolate` expression on a numeric property. */
export function rampExpression(
  property: string,
  min: number,
  max: number,
  ramp = DEFAULT_RAMP,
): any {
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

/** Compute centroid of a list of cell IDs. */
export function cellsCentroid(s2: any, cellIds: any[]): [number, number] {
  if (!cellIds.length) return [0, 0];
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const id of cellIds) {
    try {
      const [lng, lat] = cellCenter(s2, id);
      sx += lng;
      sy += lat;
      n++;
    } catch {
      // ignore broken IDs
    }
  }
  if (!n) return [0, 0];
  return [sx / n, sy / n];
}

/** Render a visible "no data" hint inside container. */
export function renderEmpty(
  container: HTMLElement,
  widgetId: string,
  hint?: string,
): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — no data</strong><br>
      ${hint ?? 'Pass valid S2 parameters (lat/lng + level, or cell tokens / IDs).'}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/** Best-effort safe wrapper for s2 calls that can throw on invalid input. */
export function tryS2<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * Add a fill+line layer pair on the map for an S2 cell FeatureCollection.
 * Source id and layer ids are derived from `id`.
 */
export function addCellsLayer(
  map: any,
  id: string,
  fc: any,
  options?: {
    fillColor?: any;
    fillOpacity?: number;
    lineColor?: string;
    lineWidth?: number;
  },
): void {
  const opts = options ?? {};
  map.addSource(id, { type: 'geojson', data: fc });
  map.addLayer({
    id: `${id}-fill`,
    type: 'fill',
    source: id,
    paint: {
      'fill-color': opts.fillColor ?? '#3388ff',
      'fill-opacity': opts.fillOpacity ?? 0.35,
    },
  });
  map.addLayer({
    id: `${id}-line`,
    type: 'line',
    source: id,
    paint: {
      'line-color': opts.lineColor ?? '#1f5fb8',
      'line-width': opts.lineWidth ?? 1,
    },
  });
}

/** Fit map to a FeatureCollection's bbox, with padding. */
export function fitToFeatures(maplibre: any, map: any, fc: any, padding = 40): void {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;
  for (const f of fc?.features ?? []) {
    const ring = f?.geometry?.coordinates?.[0];
    if (!Array.isArray(ring)) continue;
    for (const [x, y] of ring) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      count++;
    }
  }
  if (!count || !Number.isFinite(minX)) return;
  try {
    const bounds = new maplibre.LngLatBounds([minX, minY], [maxX, maxY]);
    map.fitBounds(bounds, { padding, duration: 0, maxZoom: 16 });
  } catch {
    // ignore
  }
}
