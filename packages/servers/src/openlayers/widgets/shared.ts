// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared helpers for OpenLayers widgets — CSS injection + map factory
// ---------------------------------------------------------------------------

let cssInjected = false;
let _ol: any = null;

/** Inject OpenLayers stylesheet once (CDN). */
export function ensureOlCSS() {
  if (cssInjected) return;
  if (typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/ol@10/ol.css';
  document.head.appendChild(link);
  cssInjected = true;
}

/** Lazy-load core ol bundle (proj, etc.) — cached. */
export async function loadOl(): Promise<any> {
  if (_ol) return _ol;
  _ol = await import('ol');
  return _ol;
}

/** Default Paris-centered view. */
export const DEFAULT_CENTER: [number, number] = [2.3522, 48.8566];
export const DEFAULT_ZOOM = 5;

/**
 * Create an OpenLayers map inside `container`. Returns `{ ol, Map, View, map, cleanup }`.
 * The map auto-resizes via ResizeObserver.
 */
export async function createMap(
  container: HTMLElement,
  options?: any,
): Promise<{ ol: any; map: any; cleanup: () => void }> {
  ensureOlCSS();
  const ol = await loadOl();
  const Map = (await import('ol/Map')).default;
  const View = (await import('ol/View')).default;
  const TileLayer = (await import('ol/layer/Tile')).default;
  const OSM = (await import('ol/source/OSM')).default;
  const { fromLonLat } = await import('ol/proj');

  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '400px';
  container.style.width = container.style.width || '100%';

  const {
    center = DEFAULT_CENTER,
    zoom = DEFAULT_ZOOM,
    projection = 'EPSG:3857',
    layers,
    rotation = 0,
    ...rest
  } = options ?? {};

  const baseLayers =
    layers && Array.isArray(layers) && layers.length
      ? layers
      : [new TileLayer({ source: new OSM() })];

  const map = new Map({
    target: container,
    layers: baseLayers,
    view: new View({
      center: projection === 'EPSG:4326' ? center : fromLonLat(center),
      zoom,
      projection,
      rotation,
    }),
    ...rest,
  });

  const ro = new ResizeObserver(() => {
    try {
      map.updateSize();
    } catch {
      /* ignore */
    }
  });
  ro.observe(container);

  const cleanup = () => {
    ro.disconnect();
    try {
      map.setTarget(null);
    } catch {
      /* ignore */
    }
  };

  return { ol, map, cleanup };
}

/**
 * Render a visible "no data" hint inside `container`. Returns a no-op cleanup.
 * Pattern aligned with vegalite/shared.ts → renderEmpty.
 */
export function renderEmpty(container: HTMLElement, widgetId: string, hint?: string): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — no data</strong><br>
      ${hint ?? 'Pass valid input. See the recipe for the expected shape.'}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/** Coerce a coords entry to [lon, lat]. Accepts arrays or {lon,lat}/{lng,lat}. */
export function toLonLat(p: any): [number, number] | null {
  if (!p) return null;
  if (Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number') {
    return [p[0], p[1]];
  }
  const lon = p.lon ?? p.lng ?? p.longitude ?? p.x;
  const lat = p.lat ?? p.latitude ?? p.y;
  if (typeof lon === 'number' && typeof lat === 'number') return [lon, lat];
  return null;
}

/** Build an OpenLayers Style for points/lines/polygons from a simple style hash. */
export async function buildStyle(opts: any = {}): Promise<any> {
  const { Style, Fill, Stroke, Circle, Text, Icon } = await import('ol/style');
  const styleOpts: any = {};
  if (opts.fill) styleOpts.fill = new Fill({ color: opts.fill });
  if (opts.stroke || opts.strokeWidth) {
    styleOpts.stroke = new Stroke({
      color: opts.stroke ?? '#3388ff',
      width: opts.strokeWidth ?? 2,
    });
  }
  if (opts.icon) {
    styleOpts.image = new Icon({
      src: opts.icon,
      scale: opts.iconScale ?? 1,
      anchor: opts.iconAnchor ?? [0.5, 1],
    });
  } else if (opts.radius || opts.point) {
    styleOpts.image = new Circle({
      radius: opts.radius ?? 6,
      fill: new Fill({ color: opts.pointFill ?? opts.fill ?? '#3388ff' }),
      stroke: new Stroke({
        color: opts.pointStroke ?? '#ffffff',
        width: opts.pointStrokeWidth ?? 1.5,
      }),
    });
  }
  if (opts.text) {
    styleOpts.text = new Text({
      text: opts.text,
      font: opts.font ?? '12px system-ui, sans-serif',
      fill: new Fill({ color: opts.textColor ?? '#222' }),
      stroke: new Stroke({ color: '#fff', width: 2 }),
      offsetY: opts.textOffsetY ?? -14,
    });
  }
  return new Style(styleOpts);
}
