// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared Mapbox GL helper — CSS injection + map factory
// ---------------------------------------------------------------------------

let cssInjected = false;

export async function ensureMapboxCSS() {
  if (cssInjected) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css';
  document.head.appendChild(link);
  cssInjected = true;
}

export async function createMapboxMap(container: HTMLElement, options?: any) {
  await ensureMapboxCSS();
  const mapboxgl = await import('mapbox-gl');
  mapboxgl.default.accessToken =
    options?.accessToken ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.PUBLIC_MAPBOX_TOKEN) ||
    '';
  container.style.height = container.style.height || '400px';
  const map = new mapboxgl.default.Map({
    container,
    style: options?.style || 'mapbox://styles/mapbox/light-v11',
    center: options?.center || [2.3522, 48.8566],
    zoom: options?.zoom ?? 4,
    pitch: options?.pitch ?? 0,
    bearing: options?.bearing ?? 0,
    projection: options?.projection || 'mercator',
    ...options?.mapOptions,
  });
  // Auto-resize when the container changes size (responsive layouts, split panels, etc.)
  const ro = new ResizeObserver(() => map.resize());
  ro.observe(container);
  const cleanup = () => ro.disconnect();
  return { mapboxgl: mapboxgl.default, map, cleanup };
}
