// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared helpers for Protomaps (.pmtiles) widgets — protocol registration,
// theme styles, empty-data hint.
// ---------------------------------------------------------------------------

import { ensureMaplibreCSS, loadMaplibre } from '../../maplibre/widgets/shared.js';

export { ensureMaplibreCSS, loadMaplibre };

let _pmtiles: any = null;
let _protocolRegistered = false;

/** Lazy-load the `pmtiles` library (single import, cached). */
export async function loadPmtiles(): Promise<any> {
  if (_pmtiles) return _pmtiles;
  const mod = await import('pmtiles');
  _pmtiles = mod;
  return _pmtiles;
}

/**
 * Register the `pmtiles://` protocol with MapLibre exactly once. Subsequent
 * calls are no-ops. Must run before any map uses a `pmtiles://...` source URL.
 */
export async function ensurePmtilesProtocol(maplibre: any): Promise<void> {
  if (_protocolRegistered) return;
  const pm = await loadPmtiles();
  const Protocol = pm.Protocol ?? pm.default?.Protocol;
  if (!Protocol) {
    throw new Error('pmtiles: Protocol class not found in module');
  }
  const protocol = new Protocol();
  // MapLibre v3+ signature: addProtocol(name, async (params) => {data})
  // Older signature took a callback. The pmtiles lib exposes `protocol.tile`
  // which is the bound handler.
  try {
    maplibre.addProtocol('pmtiles', protocol.tile.bind(protocol));
  } catch {
    try {
      maplibre.addProtocol('pmtiles', protocol.tile);
    } catch {
      // Already registered — ignore
    }
  }
  _protocolRegistered = true;
}

/**
 * Default public Protomaps demo bundle — worldwide vector tiles, free.
 *
 * In production we proxy through `demos.hyperskills.net/pmtiles/` because the
 * upstream `demo-bucket.protomaps.com` does not serve CORS for third-party
 * origins (see _retex_flex/05-protomaps-cors.md). The reverse proxy nginx
 * snippet lives in `infra/bot/nginx/protomaps-cors.conf` on the bot VM.
 *
 * Override priority:
 *   1. caller-provided `props.url` (highest — per-widget override)
 *   2. `import.meta.env.PUBLIC_PMTILES_URL` (Vite/SvelteKit build-time)
 *   3. `process.env.PUBLIC_PMTILES_URL` (Node/SSR build-time)
 *   4. hard-coded fallback to the CORS proxy
 *
 * Callers can pass any CORS-enabled pmtiles archive URL (R2, S3, B2,
 * self-hosted, etc.).
 */
function _resolveDefaultPmtilesUrl(): string {
  // Vite / SvelteKit-style build-time env.
  try {
    // @ts-ignore — import.meta.env may be undefined depending on bundler
    const v = import.meta?.env?.PUBLIC_PMTILES_URL;
    if (typeof v === 'string' && v.length > 0) return v;
  } catch {
    /* not in a Vite context */
  }
  // Node / SSR-style env.
  if (typeof process !== 'undefined' && process.env?.PUBLIC_PMTILES_URL) {
    return process.env.PUBLIC_PMTILES_URL;
  }
  return 'https://demos.hyperskills.net/pmtiles/v4.pmtiles';
}

export const DEFAULT_PMTILES_URL = _resolveDefaultPmtilesUrl();

/**
 * Overture Maps sample (open data, alternative to OSM).
 * NOTE: actual public Overture pmtiles URLs evolve — recipe shows usage
 * with a user-supplied URL.
 */
export const OVERTURE_PMTILES_URL =
  'https://overturemaps-tiles-us-west-2-beta.s3.amazonaws.com/2024-07-22/places.pmtiles';

/** Build the `pmtiles://...` source URL given a raw HTTPS URL. */
export function pmtilesUrl(httpsUrl: string): string {
  if (!httpsUrl) return '';
  if (httpsUrl.startsWith('pmtiles://')) return httpsUrl;
  return `pmtiles://${httpsUrl}`;
}

// ---------------------------------------------------------------------------
// Theme styles — Protomaps "basemaps" reference styles, simplified inline so
// the widget works with any pmtiles whose vector schema follows the
// Protomaps basemaps convention (layers: earth, water, landuse, roads,
// buildings, boundaries, places).
// ---------------------------------------------------------------------------

type Theme = 'light' | 'dark' | 'grayscale' | 'white' | 'black';

const PALETTES: Record<Theme, any> = {
  light: {
    background: '#f5f4f0',
    earth: '#e0e0d8',
    water: '#9bd3e0',
    landuse: '#dfe7d4',
    roads: '#ffffff',
    roadsCasing: '#bdbdbd',
    buildings: '#dad7c8',
    boundaries: '#888',
    placesText: '#333',
    placesHalo: '#fff',
  },
  dark: {
    background: '#1a1a1f',
    earth: '#22262d',
    water: '#0e2a3b',
    landuse: '#23282e',
    roads: '#3d4147',
    roadsCasing: '#2a2d31',
    buildings: '#2c3036',
    boundaries: '#666',
    placesText: '#e6e6e6',
    placesHalo: '#000',
  },
  grayscale: {
    background: '#f0f0f0',
    earth: '#e0e0e0',
    water: '#bdbdbd',
    landuse: '#d4d4d4',
    roads: '#ffffff',
    roadsCasing: '#9a9a9a',
    buildings: '#cfcfcf',
    boundaries: '#777',
    placesText: '#333',
    placesHalo: '#fff',
  },
  white: {
    background: '#ffffff',
    earth: '#ffffff',
    water: '#f2f2f2',
    landuse: '#fafafa',
    roads: '#e8e8e8',
    roadsCasing: '#cfcfcf',
    buildings: '#f0f0f0',
    boundaries: '#888',
    placesText: '#222',
    placesHalo: '#fff',
  },
  black: {
    background: '#000000',
    earth: '#0a0a0a',
    water: '#161616',
    landuse: '#0d0d0d',
    roads: '#222222',
    roadsCasing: '#111111',
    buildings: '#161616',
    boundaries: '#555',
    placesText: '#dddddd',
    placesHalo: '#000',
  },
};

/**
 * Build a MapLibre style JSON for a given pmtiles URL + theme. Assumes the
 * pmtiles archive uses the Protomaps basemaps vector schema. Layer names that
 * don't exist in a given archive are gracefully ignored by MapLibre.
 */
export function themedStyle(pmtilesHttpsUrl: string, theme: Theme): any {
  const p = PALETTES[theme] ?? PALETTES.light;
  return {
    version: 8,
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sources: {
      protomaps: {
        type: 'vector',
        url: pmtilesUrl(pmtilesHttpsUrl),
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': p.background } },
      { id: 'earth', type: 'fill', source: 'protomaps', 'source-layer': 'earth', paint: { 'fill-color': p.earth } },
      { id: 'landuse', type: 'fill', source: 'protomaps', 'source-layer': 'landuse', paint: { 'fill-color': p.landuse } },
      { id: 'water', type: 'fill', source: 'protomaps', 'source-layer': 'water', paint: { 'fill-color': p.water } },
      {
        id: 'roads-casing',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        paint: { 'line-color': p.roadsCasing, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 16, 6] },
      },
      {
        id: 'roads',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        paint: { 'line-color': p.roads, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.2, 16, 4] },
      },
      {
        id: 'buildings',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'buildings',
        paint: { 'fill-color': p.buildings },
      },
      {
        id: 'boundaries',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'boundaries',
        paint: { 'line-color': p.boundaries, 'line-width': 1, 'line-dasharray': [2, 2] },
      },
      {
        id: 'places',
        type: 'symbol',
        source: 'protomaps',
        'source-layer': 'places',
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
        },
        paint: {
          'text-color': p.placesText,
          'text-halo-color': p.placesHalo,
          'text-halo-width': 1.2,
        },
      },
    ],
  };
}

/**
 * Standard renderEmpty hint when caller forgot to pass a pmtiles URL.
 * Mirrors the vegalite/shared.ts pattern.
 */
export function renderEmpty(container: HTMLElement, widgetId: string, hint?: string): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — no data</strong><br>
      ${hint ?? 'Pass <code>url</code> pointing to a public <code>.pmtiles</code> archive (HTTPS, with CORS + Range support).'}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/**
 * Bootstrap a MapLibre map preconfigured with the pmtiles protocol and a
 * given style. Returns `{ map, cleanup }`.
 */
export async function createPmtilesMap(
  container: HTMLElement,
  options: {
    style: any;
    center?: [number, number];
    zoom?: number;
    pitch?: number;
    bearing?: number;
    extra?: Record<string, unknown>;
  },
): Promise<{ maplibre: any; map: any; cleanup: () => void }> {
  await ensureMaplibreCSS();
  const maplibre = await loadMaplibre();
  await ensurePmtilesProtocol(maplibre);

  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '400px';
  container.style.width = container.style.width || '100%';

  const { style, center = [0, 20], zoom = 1.5, pitch = 0, bearing = 0, extra = {} } = options;

  const map = new maplibre.Map({
    container,
    style,
    center,
    zoom,
    pitch,
    bearing,
    attributionControl: { compact: true },
    ...extra,
  });

  const ro = new ResizeObserver(() => {
    try {
      map.resize();
    } catch {
      // ignore
    }
  });
  ro.observe(container);

  const cleanup = () => {
    ro.disconnect();
    try {
      map.remove();
    } catch {
      // ignore
    }
  };

  return { maplibre, map, cleanup };
}

/** Wait for the map's `load` event before further setup. */
export function whenLoaded(map: any): Promise<void> {
  return new Promise((resolve) => {
    if (map.loaded && map.loaded()) {
      resolve();
      return;
    }
    map.once('load', () => resolve());
  });
}
