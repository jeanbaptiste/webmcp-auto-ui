// @ts-nocheck
import { ensureLeafletCSS, loadScript } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 11, points = [], radius = 25, blur = 15, maxZoom = 17, max = 1.0, gradient } = data as any;

  await ensureLeafletCSS();
  const L = (await import('leaflet')).default ?? await import('leaflet');
  await loadScript('https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js');

  container.style.height = container.style.height || "100%";
  container.style.minHeight = container.style.minHeight || "400px";
  const map = L.map(container).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

  const heatOpts: any = { radius, blur, maxZoom, max };
  if (gradient) heatOpts.gradient = gradient;

  (L as any).heatLayer(points, heatOpts).addTo(map);

  return () => { map.remove(); };
}
