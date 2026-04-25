// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared deck.gl helpers — MapLibre basemap + Deck overlay (MapboxOverlay)
// ---------------------------------------------------------------------------

import { ensureMaplibreCSS, loadMaplibre, DEFAULT_STYLE, DARK_STYLE, POSITRON_STYLE } from '../../maplibre/widgets/shared.js';

export { DEFAULT_STYLE, DARK_STYLE, POSITRON_STYLE };

let _deckCore: any = null;
let _deckLayers: any = null;
let _deckGeo: any = null;
let _deckAgg: any = null;
let _deckMesh: any = null;
let _deckMapbox: any = null;

export async function loadDeckCore(): Promise<any> {
  if (_deckCore) return _deckCore;
  _deckCore = await import('@deck.gl/core');
  return _deckCore;
}

export async function loadDeckLayers(): Promise<any> {
  if (_deckLayers) return _deckLayers;
  _deckLayers = await import('@deck.gl/layers');
  return _deckLayers;
}

export async function loadDeckGeo(): Promise<any> {
  if (_deckGeo) return _deckGeo;
  _deckGeo = await import('@deck.gl/geo-layers');
  return _deckGeo;
}

export async function loadDeckAgg(): Promise<any> {
  if (_deckAgg) return _deckAgg;
  _deckAgg = await import('@deck.gl/aggregation-layers');
  return _deckAgg;
}

export async function loadDeckMesh(): Promise<any> {
  if (_deckMesh) return _deckMesh;
  _deckMesh = await import('@deck.gl/mesh-layers');
  return _deckMesh;
}

/** Load the MapboxOverlay integration (works with maplibre-gl). */
export async function loadMapboxOverlay(): Promise<any> {
  if (_deckMapbox) return _deckMapbox;
  // @deck.gl/mapbox is part of deck.gl umbrella package
  const mod = await import('@deck.gl/mapbox');
  _deckMapbox = mod;
  return _deckMapbox;
}

export function resolveStyle(name?: string): string {
  if (!name) return DEFAULT_STYLE;
  if (name.startsWith('http') || name.startsWith('mapbox://')) return name;
  switch (name.toLowerCase()) {
    case 'dark':
    case 'dark-matter':
      return DARK_STYLE;
    case 'positron':
    case 'light':
      return POSITRON_STYLE;
    case 'voyager':
    default:
      return DEFAULT_STYLE;
  }
}

/**
 * Bootstrap a MapLibre basemap with a deck.gl overlay using MapboxOverlay.
 * Returns { map, overlay, maplibre, cleanup }.
 */
export async function createDeckMap(
  container: HTMLElement,
  options?: any,
): Promise<{ map: any; overlay: any; maplibre: any; cleanup: () => void }> {
  await ensureMaplibreCSS();
  const maplibre = await loadMaplibre();
  const { MapboxOverlay } = await loadMapboxOverlay();

  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '420px';
  container.style.width = container.style.width || '100%';
  container.style.position = container.style.position || 'relative';

  const {
    center = [2.3522, 48.8566],
    zoom = 5,
    style,
    pitch = 0,
    bearing = 0,
    layers = [],
    interleaved = false,
    ...rest
  } = options ?? {};

  const map = new maplibre.Map({
    container,
    style: resolveStyle(style),
    center,
    zoom,
    pitch,
    bearing,
    attributionControl: { compact: true },
    ...rest,
  });

  const overlay = new MapboxOverlay({ interleaved, layers });

  // Wait for style + add overlay as a control
  await new Promise<void>((resolve) => {
    if (map.loaded && map.loaded()) resolve();
    else map.once('load', () => resolve());
  });
  map.addControl(overlay);

  const ro = new ResizeObserver(() => {
    try {
      map.resize();
    } catch {
      /* ignore */
    }
  });
  ro.observe(container);

  const cleanup = () => {
    ro.disconnect();
    try {
      overlay.finalize?.();
    } catch {
      /* ignore */
    }
    try {
      map.remove();
    } catch {
      /* ignore */
    }
  };

  return { map, overlay, maplibre, cleanup };
}

/** Render a visible "no data" message inside `container`, return no-op cleanup. */
export function renderEmpty(container: HTMLElement, widgetId: string, hint?: string): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — no data</strong><br>
      ${hint ?? 'Provide the required input fields described in the recipe.'}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/** Color helpers — accept [r,g,b] / [r,g,b,a] / hex string / undefined. */
export function toRGBA(c: any, fallback: number[] = [80, 130, 230, 200]): number[] {
  if (Array.isArray(c) && (c.length === 3 || c.length === 4)) return c;
  if (typeof c === 'string' && c.startsWith('#')) {
    const hex = c.slice(1);
    const parse = (h: string) => parseInt(h, 16);
    if (hex.length === 3) {
      return [parse(hex[0] + hex[0]), parse(hex[1] + hex[1]), parse(hex[2] + hex[2]), 255];
    }
    if (hex.length === 6) {
      return [parse(hex.slice(0, 2)), parse(hex.slice(2, 4)), parse(hex.slice(4, 6)), 255];
    }
    if (hex.length === 8) {
      return [
        parse(hex.slice(0, 2)),
        parse(hex.slice(2, 4)),
        parse(hex.slice(4, 6)),
        parse(hex.slice(6, 8)),
      ];
    }
  }
  return fallback;
}

/** Normalize "points" input. Accepts [{lng,lat,...}] or {lng:[...],lat:[...]}. */
export function toPoints(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.points)) return data.points;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.lng) && Array.isArray(data.lat)) {
    const n = Math.min(data.lng.length, data.lat.length);
    const w: any[] = data.weight ?? data.value ?? null;
    const out: any[] = [];
    for (let i = 0; i < n; i++) {
      const r: any = { lng: data.lng[i], lat: data.lat[i] };
      if (Array.isArray(w)) r.weight = w[i];
      out.push(r);
    }
    return out;
  }
  return [];
}
