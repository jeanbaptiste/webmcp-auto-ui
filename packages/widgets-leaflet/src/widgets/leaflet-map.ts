// ---------------------------------------------------------------------------
// leaflet-map — Interactive map with markers, popups, zoom
// ---------------------------------------------------------------------------

import L from 'leaflet';
import { injectLeafletCSS, ensureHeight, TILE_URL, TILE_ATTR } from './shared.js';

interface MarkerDef {
  lat: number;
  lng: number;
  label?: string;
  popup?: string;
}

export function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): () => void {
  injectLeafletCSS(container);
  ensureHeight(container, data.height as string | undefined);

  const markers = (data.markers as MarkerDef[]) ?? [];
  const zoom = (data.zoom as number) ?? 13;
  const title = data.title as string | undefined;

  // Build wrapper
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;';

  if (title) {
    const h = document.createElement('div');
    h.style.cssText =
      'font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;padding:8px 12px 4px;';
    h.textContent = title;
    wrapper.appendChild(h);
  }

  const mapDiv = document.createElement('div');
  mapDiv.style.cssText = 'flex:1;min-height:0;';
  wrapper.appendChild(mapDiv);
  container.appendChild(wrapper);

  // Determine center
  let center: [number, number];
  if (Array.isArray(data.center) && data.center.length >= 2) {
    center = [data.center[0] as number, data.center[1] as number];
  } else if (markers.length > 0) {
    const avgLat = markers.reduce((s, m) => s + m.lat, 0) / markers.length;
    const avgLng = markers.reduce((s, m) => s + m.lng, 0) / markers.length;
    center = [avgLat, avgLng];
  } else {
    center = [48.8566, 2.3522]; // Paris fallback
  }

  const map = L.map(mapDiv).setView(center, zoom);
  L.tileLayer(TILE_URL, { attribution: TILE_ATTR }).addTo(map);

  // Add markers
  for (const m of markers) {
    const marker = L.marker([m.lat, m.lng]).addTo(map);
    if (m.label) marker.bindTooltip(m.label);
    if (m.popup) marker.bindPopup(m.popup);
  }

  // Fit bounds if multiple markers and no explicit center
  if (markers.length > 1 && !Array.isArray(data.center)) {
    const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }

  return () => { map.remove(); };
}
