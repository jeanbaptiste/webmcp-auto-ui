// @ts-nocheck
import { loadMaplibre, ensureMaplibreCSS } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const {
    center = [0, 0],
    zoom = 2,
    tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution = '&copy; OpenStreetMap contributors',
    tileSize = 256,
  } = data as any;

  await ensureMaplibreCSS();
  const maplibre = await loadMaplibre();

  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '400px';
  container.style.width = container.style.width || '100%';

  const map = new maplibre.Map({
    container,
    style: {
      version: 8,
      sources: {
        raster: {
          type: 'raster',
          tiles: [tileUrl],
          tileSize,
          attribution,
        },
      },
      layers: [{ id: 'raster', type: 'raster', source: 'raster' }],
    },
    center,
    zoom,
  });

  const ro = new ResizeObserver(() => {
    try { map.resize(); } catch {}
  });
  ro.observe(container);

  return () => {
    ro.disconnect();
    try { map.remove(); } catch {}
  };
}
