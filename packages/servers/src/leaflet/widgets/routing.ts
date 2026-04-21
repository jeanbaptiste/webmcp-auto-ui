// @ts-nocheck
import { ensureLeafletCSS, loadScript } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 12, waypoints = [], routeWhileDragging = true, profile = 'driving' } = data as any;

  await ensureLeafletCSS();
  const L = (await import('leaflet')).default ?? await import('leaflet');

  // Load routing machine
  const rmCss = document.createElement('link');
  rmCss.rel = 'stylesheet';
  rmCss.href = 'https://unpkg.com/leaflet-routing-machine@3/dist/leaflet-routing-machine.css';
  document.head.appendChild(rmCss);
  await loadScript('https://unpkg.com/leaflet-routing-machine@3/dist/leaflet-routing-machine.min.js');

  container.style.height = container.style.height || "100%";
  container.style.minHeight = container.style.minHeight || "400px";
  const map = L.map(container).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

  const wps = waypoints.length > 0
    ? waypoints.map((wp: any) => L.latLng(wp[0] || wp.lat, wp[1] || wp.lng))
    : [L.latLng(48.8566, 2.3522), L.latLng(48.8606, 2.3376)];

  (L as any).Routing.control({
    waypoints: wps,
    routeWhileDragging,
    router: (L as any).Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1',
      profile: `${profile}`,
    }),
  }).addTo(map);

  return () => { map.remove(); };
}
