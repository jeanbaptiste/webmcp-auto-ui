// @ts-nocheck
import { ensureLeafletCSS, loadScript } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 10, points = [], color = '#e74c3c', size = 6, opacity = 0.8 } = data as any;

  await ensureLeafletCSS();
  const L = (await import('leaflet')).default ?? await import('leaflet');
  await loadScript('https://unpkg.com/leaflet.glify@3/dist/glify-browser.js');

  container.style.height = container.style.height || '400px';
  const map = L.map(container).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

  if (points.length > 0 && (L as any).glify) {
    (L as any).glify.points({
      map,
      data: points.map((p: any) => [p[0], p[1]]),
      color: (() => {
        // Parse hex color to RGB
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        return { r, g, b };
      })(),
      size,
      opacity,
    });
  }

  return () => { map.remove(); };
}
