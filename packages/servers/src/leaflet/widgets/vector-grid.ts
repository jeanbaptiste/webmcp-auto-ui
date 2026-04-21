// @ts-nocheck
import { ensureLeafletCSS, loadScript } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 10, url, vectorTileLayerStyles, interactive = true } = data as any;

  await ensureLeafletCSS();
  const L = (await import('leaflet')).default ?? await import('leaflet');
  await loadScript('https://unpkg.com/leaflet.vectorgrid@1.3.0/dist/Leaflet.VectorGrid.bundled.min.js');

  container.style.height = container.style.height || "100%";
  container.style.minHeight = container.style.minHeight || "400px";
  const map = L.map(container).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

  if (url) {
    (L as any).vectorGrid.protobuf(url, {
      vectorTileLayerStyles: vectorTileLayerStyles || {},
      interactive,
    }).addTo(map);
  }

  return () => { map.remove(); };
}
