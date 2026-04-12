// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 13, markers = [] } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  for (const m of markers) {
    const latlng = m.latlng || m.position || center;
    const marker = L.marker(latlng).addTo(map);
    if (m.popup) marker.bindPopup(m.popup);
    if (m.tooltip) marker.bindTooltip(m.tooltip);
  }

  if (markers.length === 0) {
    L.marker(center).addTo(map).bindPopup('Default marker');
  }

  return () => { map.remove(); };
}
