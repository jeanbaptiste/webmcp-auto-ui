// @ts-nocheck
import { ensureLeafletCSS, loadScript } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 5, provider = 'OpenStreetMap.Mapnik' } = data as any;

  await ensureLeafletCSS();
  const L = (await import('leaflet')).default ?? await import('leaflet');
  await loadScript('https://unpkg.com/leaflet-providers@2/leaflet-providers.js');

  container.style.height = container.style.height || "100%";
  container.style.minHeight = container.style.minHeight || "400px";
  const map = L.map(container).setView(center, zoom);
  (L.tileLayer as any).provider(provider).addTo(map);

  return () => { map.remove(); };
}
