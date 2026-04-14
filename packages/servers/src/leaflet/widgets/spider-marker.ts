// @ts-nocheck
import { ensureLeafletCSS, loadScript } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 14, markers = [] } = data as any;

  await ensureLeafletCSS();
  const L = (await import('leaflet')).default ?? await import('leaflet');
  await loadScript('https://unpkg.com/overlapping-marker-spiderfier-leaflet@0.2.6/dist/oms.min.js', 'OverlappingMarkerSpiderfier');

  container.style.height = container.style.height || '400px';
  const map = L.map(container).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

  const oms = new (window as any).OverlappingMarkerSpiderfier(map);

  for (const m of markers) {
    const latlng = m.latlng || m.position || center;
    const marker = L.marker(latlng).addTo(map);
    if (m.popup) marker.bindPopup(m.popup);
    oms.addMarker(marker);
  }

  return () => { map.remove(); };
}
