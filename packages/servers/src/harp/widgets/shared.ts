// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared helpers for Harp.gl widgets — lazy loading + map factory
// Note: Harp.gl is ARCHIVED by HERE (2023). Init may fail with modern toolchains.
// ---------------------------------------------------------------------------

let _mapview: any = null;
let _datasource: any = null;
let _controls: any = null;
let _omv: any = null;

/** Default theme — public Berlin tilezen base from unpkg. May fail if archived. */
export const DEFAULT_THEME =
  'https://unpkg.com/@here/harp-map-theme@latest/resources/berlin_tilezen_base.json';

export const REDUCED_DAY_THEME =
  'https://unpkg.com/@here/harp-map-theme@latest/resources/berlin_tilezen_day_reduced.json';

export const REDUCED_NIGHT_THEME =
  'https://unpkg.com/@here/harp-map-theme@latest/resources/berlin_tilezen_night_reduced.json';

/** Lazy-load harp packages. Returns null on failure. */
export async function loadHarp(): Promise<any> {
  try {
    if (!_mapview) _mapview = await import('@here/harp-mapview');
    if (!_datasource) _datasource = await import('@here/harp-datasource-protocol');
    if (!_controls) _controls = await import('@here/harp-map-controls');
    if (!_omv) _omv = await import('@here/harp-omv-datasource');
    return {
      MapView: _mapview.MapView,
      MapViewEventNames: _mapview.MapViewEventNames,
      mapview: _mapview,
      datasource: _datasource,
      MapControls: _controls.MapControls,
      MapControlsUI: _controls.MapControlsUI,
      OmvDataSource: _omv.OmvDataSource,
      APIFormat: _omv.APIFormat ?? _omv.OmvDataSource?.APIFormat,
      AuthenticationMethod: _omv.AuthenticationMethod,
      omv: _omv,
    };
  } catch (e) {
    console.error('[harp] failed to load harp.gl modules:', e);
    return null;
  }
}

/**
 * Create a Harp MapView inside `container`. Returns `{ mapView, canvas, cleanup }`
 * or null on failure.
 *
 * options: { theme?, projection?: 'mercator'|'sphere', tilt?, heading?, zoom?, center?: [lng, lat] }
 */
export async function createMapView(
  container: HTMLElement,
  options: any = {},
): Promise<{ mapView: any; canvas: HTMLCanvasElement; cleanup: () => void; harp: any } | null> {
  const harp = await loadHarp();
  if (!harp) return null;

  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '400px';
  container.style.width = container.style.width || '100%';
  container.style.position = container.style.position || 'relative';

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  let mapView: any;
  try {
    const projection =
      options.projection === 'sphere'
        ? harp.mapview?.sphereProjection ?? harp.datasource?.sphereProjection
        : harp.mapview?.mercatorProjection ?? harp.datasource?.mercatorProjection;

    const cfg: any = {
      canvas,
      theme: options.theme ?? DEFAULT_THEME,
    };
    if (projection) cfg.projection = projection;

    mapView = new harp.MapView(cfg);
  } catch (e) {
    console.error('[harp] MapView constructor failed:', e);
    container.removeChild(canvas);
    return null;
  }

  // Default camera
  try {
    const [lng = 13.405, lat = 52.52] = options.center ?? [];
    mapView.lookAt({
      target: { latitude: lat, longitude: lng },
      zoomLevel: options.zoom ?? 14,
      tilt: options.tilt ?? 0,
      heading: options.heading ?? 0,
    });
  } catch (e) {
    console.warn('[harp] lookAt failed:', e);
  }

  let resizeRaf = 0;
  const resize = () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      try {
        mapView.resize(container.clientWidth, container.clientHeight);
      } catch {
        // ignore
      }
    });
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const cleanup = () => {
    cancelAnimationFrame(resizeRaf);
    ro.disconnect();
    try {
      mapView.dispose();
    } catch {
      // ignore
    }
    try {
      if (canvas.parentNode === container) container.removeChild(canvas);
    } catch {
      // ignore
    }
  };

  return { mapView, canvas, cleanup, harp };
}

/**
 * Add a default OMV/MVT data source. Best-effort: returns null if it fails or
 * the URL/key is missing. Many archived Harp samples used HERE Vector Tile API
 * which requires a key — without it, the layer simply renders nothing.
 */
export function tryAddOmvDataSource(harp: any, mapView: any, options: any = {}): any {
  try {
    const ds = new harp.OmvDataSource({
      baseUrl: options.baseUrl ?? 'https://vector.hereapi.com/v2/vectortiles/base/mc',
      apiFormat: options.apiFormat ?? harp.APIFormat?.XYZOMV ?? 0,
      styleSetName: options.styleSetName ?? 'tilezen',
      authenticationCode: options.apiKey ?? '',
      authenticationMethod: options.apiKey
        ? { method: harp.AuthenticationMethod?.QueryString ?? 'QueryString', name: 'apikey' }
        : undefined,
    });
    mapView.addDataSource(ds);
    return ds;
  } catch (e) {
    console.warn('[harp] OMV data source add failed:', e);
    return null;
  }
}

/** Try wiring default MapControls (pan/zoom). No-op on failure. */
export function tryAddControls(harp: any, mapView: any): any {
  try {
    const controls = new harp.MapControls(mapView);
    return controls;
  } catch (e) {
    console.warn('[harp] MapControls failed:', e);
    return null;
  }
}

/**
 * Render a visible error/notice card inside `container`.
 * Used when init fails or no data is provided.
 */
export function renderEmpty(
  container: HTMLElement,
  widgetId: string,
  hint?: string,
): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId}</strong><br>
      ${hint ?? 'Harp.gl could not initialize. The library is archived (HERE, 2023) and may be incompatible with the current toolchain.'}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/** Optional title bar above the canvas. */
export function appendTitle(container: HTMLElement, title?: string) {
  if (!title) return;
  const h = document.createElement('div');
  h.textContent = title;
  h.style.cssText =
    'font-weight:600;font-size:14px;padding:4px 8px;color:#1a1a1a;background:rgba(255,255,255,0.85);position:absolute;top:6px;left:6px;border-radius:4px;z-index:2;pointer-events:none;';
  container.appendChild(h);
}
