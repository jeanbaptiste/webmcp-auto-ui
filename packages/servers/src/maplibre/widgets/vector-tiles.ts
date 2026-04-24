// @ts-nocheck
import { loadMaplibre, ensureMaplibreCSS } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [0, 0], zoom = 2, tilesUrl, sourceLayer, layerType = 'line', paint } = data as any;

  if (!tilesUrl || !sourceLayer) return;

  await ensureMaplibreCSS();
  const maplibre = await loadMaplibre();

  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '400px';
  container.style.width = container.style.width || '100%';

  const defaultPaint =
    layerType === 'fill'
      ? { 'fill-color': '#3388ff', 'fill-opacity': 0.4 }
      : layerType === 'circle'
      ? { 'circle-color': '#e74c3c', 'circle-radius': 4 }
      : { 'line-color': '#3388ff', 'line-width': 1.5 };

  const map = new maplibre.Map({
    container,
    style: {
      version: 8,
      sources: {
        vt: { type: 'vector', tiles: [tilesUrl], minzoom: 0, maxzoom: 14 },
      },
      layers: [
        {
          id: 'vt-layer',
          type: layerType,
          source: 'vt',
          'source-layer': sourceLayer,
          paint: { ...defaultPaint, ...(paint ?? {}) },
        },
      ],
    },
    center,
    zoom,
  });

  const ro = new ResizeObserver(() => { try { map.resize(); } catch {} });
  ro.observe(container);

  return () => {
    ro.disconnect();
    try { map.remove(); } catch {}
  };
}
