// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared helpers for MapLibre GL JS widgets — CSS injection + map factory
// ---------------------------------------------------------------------------

let cssInjected = false;
let _maplibre: any = null;

/** Lazy-load maplibre-gl (single import, cached). */
export async function loadMaplibre(): Promise<any> {
  if (_maplibre) return _maplibre;
  const mod = await import('maplibre-gl');
  _maplibre = mod.default ?? mod;
  return _maplibre;
}

/** Inject MapLibre stylesheet once. */
export async function ensureMaplibreCSS() {
  if (cssInjected) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
  document.head.appendChild(link);
  cssInjected = true;
}

/**
 * Default basemap style — Carto Voyager (free, no API key required).
 * Vector tiles served via MapLibre demo tiles fallback.
 */
export const DEFAULT_STYLE =
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

export const DARK_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export const POSITRON_STYLE =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/**
 * Create a MapLibre map inside `container`. Returns `{ maplibre, map, cleanup }`.
 * Wires a ResizeObserver so the map stays fit when the container resizes.
 */
export async function createMap(
  container: HTMLElement,
  options?: any,
): Promise<{ maplibre: any; map: any; cleanup: () => void }> {
  await ensureMaplibreCSS();
  const maplibre = await loadMaplibre();

  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '400px';
  container.style.width = container.style.width || '100%';

  const {
    center = [2.3522, 48.8566],
    zoom = 5,
    style = DEFAULT_STYLE,
    pitch = 0,
    bearing = 0,
    ...rest
  } = options ?? {};

  const map = new maplibre.Map({
    container,
    style,
    center,
    zoom,
    pitch,
    bearing,
    attributionControl: { compact: true },
    ...rest,
  });

  const ro = new ResizeObserver(() => {
    try {
      map.resize();
    } catch {
      // map may be already removed — ignore
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

/** Wait for map `load` event before running setup. */
export function whenLoaded(map: any): Promise<void> {
  return new Promise((resolve) => {
    if (map.loaded && map.loaded()) {
      resolve();
      return;
    }
    map.once('load', () => resolve());
  });
}
