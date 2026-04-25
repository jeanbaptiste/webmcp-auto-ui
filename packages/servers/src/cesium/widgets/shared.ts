// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared helpers for CesiumJS widgets — globe/viewer factory + CSS injection
// ---------------------------------------------------------------------------

let cssInjected = false;
let _cesium: any = null;

/** Lazy-load cesium (single import, cached). */
export async function loadCesium(): Promise<any> {
  if (_cesium) return _cesium;
  const mod = await import('cesium');
  _cesium = (mod as any).default ?? mod;
  // Cesium consumes assets relative to a global base url. Default to /cesium/
  // (apps must serve cesium static assets there). Safe to set repeatedly.
  if (typeof window !== 'undefined' && !(window as any).CESIUM_BASE_URL) {
    (window as any).CESIUM_BASE_URL = '/cesium/';
  }
  return _cesium;
}

/** Inject Cesium widget stylesheet once. */
export async function ensureCesiumCSS() {
  if (cssInjected) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/cesium@1/Build/Cesium/Widgets/widgets.css';
  document.head.appendChild(link);
  cssInjected = true;
}

/**
 * Create a Cesium Viewer inside `container`. Returns `{ Cesium, viewer, cleanup }`.
 * Defaults: OpenStreetMap imagery (no Ion key required), most chrome disabled.
 */
export async function createViewer(
  container: HTMLElement,
  options?: any,
): Promise<{ Cesium: any; viewer: any; cleanup: () => void }> {
  await ensureCesiumCSS();
  const Cesium = await loadCesium();

  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '420px';
  container.style.width = container.style.width || '100%';
  container.style.position = container.style.position || 'relative';

  const {
    useOSM = true,
    animation = false,
    timeline = false,
    baseLayerPicker = false,
    geocoder = false,
    homeButton = false,
    sceneModePicker = false,
    navigationHelpButton = false,
    fullscreenButton = false,
    infoBox = false,
    selectionIndicator = false,
    ...rest
  } = options ?? {};

  const viewerOptions: any = {
    animation,
    timeline,
    baseLayerPicker,
    geocoder,
    homeButton,
    sceneModePicker,
    navigationHelpButton,
    fullscreenButton,
    infoBox,
    selectionIndicator,
    ...rest,
  };

  if (useOSM && !rest.imageryProvider) {
    try {
      viewerOptions.imageryProvider = new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
      });
    } catch {
      // fallback: leave default
    }
  }

  const viewer = new Cesium.Viewer(container, viewerOptions);

  // Hide Cesium credits container if present (avoid layout overflow)
  try {
    const credit = viewer.cesiumWidget?.creditContainer;
    if (credit) (credit as HTMLElement).style.display = 'none';
  } catch {
    // ignore
  }

  const cleanup = () => {
    try {
      viewer.destroy();
    } catch {
      // ignore
    }
    try {
      container.innerHTML = '';
    } catch {
      // ignore
    }
  };

  return { Cesium, viewer, cleanup };
}

/**
 * Render a visible empty-state message inside `container`. Returns no-op cleanup.
 */
export function renderEmpty(
  container: HTMLElement,
  widgetId: string,
  hint?: string,
): () => void {
  container.style.minHeight = container.style.minHeight || '120px';
  container.innerHTML = `
    <div style="padding:12px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — no data</strong><br>
      ${hint ?? 'No coordinates / data provided. Pass at least <code>longitude</code> and <code>latitude</code>.'}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/** Coerce a [lon, lat] or [lon, lat, height] into Cesium.Cartesian3. */
export function toCartesian3(Cesium: any, p: any): any {
  if (!Array.isArray(p) || p.length < 2) return null;
  const [lon, lat, h = 0] = p;
  return Cesium.Cartesian3.fromDegrees(Number(lon), Number(lat), Number(h));
}

/** Coerce an array of [lon, lat[, h]] into a flat [lon, lat, h, ...] for fromDegreesArrayHeights. */
export function toFlatDegreesHeights(points: any[]): number[] {
  const flat: number[] = [];
  for (const p of points ?? []) {
    if (!Array.isArray(p) || p.length < 2) continue;
    flat.push(Number(p[0]), Number(p[1]), Number(p[2] ?? 0));
  }
  return flat;
}

/** Coerce an array of [lon, lat] into a flat [lon, lat, ...] for fromDegreesArray. */
export function toFlatDegrees(points: any[]): number[] {
  const flat: number[] = [];
  for (const p of points ?? []) {
    if (!Array.isArray(p) || p.length < 2) continue;
    flat.push(Number(p[0]), Number(p[1]));
  }
  return flat;
}

/** Return a CSS color string usable by Cesium.Color.fromCssColorString. */
export function cssColor(c: any, fallback = '#3b82f6'): string {
  if (typeof c === 'string' && c.length > 0) return c;
  return fallback;
}
