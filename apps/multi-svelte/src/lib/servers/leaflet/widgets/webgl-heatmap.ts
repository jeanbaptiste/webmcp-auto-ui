// @ts-nocheck
import { ensureLeafletCSS, loadScript } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 11, points = [], size = 30000, opacity = 1, alphaRange = 1 } = data as any;

  await ensureLeafletCSS();
  const L = (await import('leaflet')).default ?? await import('leaflet');
  await loadScript('https://unpkg.com/webgl-heatmap@0.2.7/webgl-heatmap.js', 'createWebGLHeatmap');
  await loadScript('https://unpkg.com/leaflet-webgl-heatmap@0.2.7/leaflet-webgl-heatmap.min.js');

  container.style.height = container.style.height || '400px';
  const map = L.map(container).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

  const heatLayer = new (L as any).TileLayer.WebGLHeatMap({
    size,
    opacity,
    alphaRange,
  });
  heatLayer.setData(points);
  map.addLayer(heatLayer);

  return () => { map.remove(); };
}
