// @ts-nocheck
import { ensureLeafletCSS, loadScript } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 13, draw = {}, edit = true } = data as any;

  await ensureLeafletCSS();
  const L = (await import('leaflet')).default ?? await import('leaflet');

  // Load Leaflet Draw
  const drawCss = document.createElement('link');
  drawCss.rel = 'stylesheet';
  drawCss.href = 'https://unpkg.com/leaflet-draw@1/dist/leaflet.draw.css';
  document.head.appendChild(drawCss);
  await loadScript('https://unpkg.com/leaflet-draw@1/dist/leaflet.draw.js');

  container.style.height = container.style.height || "100%";
  container.style.minHeight = container.style.minHeight || "400px";
  const map = L.map(container).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

  const drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  const drawControl = new (L as any).Control.Draw({
    draw: {
      polygon: draw.polygon !== false,
      polyline: draw.polyline !== false,
      rectangle: draw.rectangle !== false,
      circle: draw.circle !== false,
      marker: draw.marker !== false,
      circlemarker: draw.circlemarker ?? false,
    },
    edit: edit ? { featureGroup: drawnItems } : false,
  });
  map.addControl(drawControl);

  map.on((L as any).Draw.Event.CREATED, (e: any) => {
    drawnItems.addLayer(e.layer);
  });

  return () => { map.remove(); };
}
