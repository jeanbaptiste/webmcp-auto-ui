// @ts-nocheck
import { ensureLeafletCSS, loadScript } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 5, markers = [] } = data as any;

  await ensureLeafletCSS();
  const L = (await import('leaflet')).default ?? await import('leaflet');

  // Load MarkerCluster plugin
  const mcCss = document.createElement('link');
  mcCss.rel = 'stylesheet';
  mcCss.href = 'https://unpkg.com/leaflet.markercluster@1/dist/MarkerCluster.css';
  document.head.appendChild(mcCss);
  const mcCss2 = document.createElement('link');
  mcCss2.rel = 'stylesheet';
  mcCss2.href = 'https://unpkg.com/leaflet.markercluster@1/dist/MarkerCluster.Default.css';
  document.head.appendChild(mcCss2);
  await loadScript('https://unpkg.com/leaflet.markercluster@1/dist/leaflet.markercluster.js');

  container.style.height = container.style.height || '400px';
  const map = L.map(container).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

  const clusterGroup = (L as any).markerClusterGroup();
  for (const m of markers) {
    const latlng = m.latlng || m.position || [48.8 + Math.random() * 0.5, 2.3 + Math.random() * 0.5];
    const marker = L.marker(latlng);
    if (m.popup) marker.bindPopup(m.popup);
    clusterGroup.addLayer(marker);
  }
  map.addLayer(clusterGroup);

  return () => { map.remove(); };
}
