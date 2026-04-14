// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 12, markers = [] } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  for (const m of markers) {
    const latlng = m.latlng || m.position || center;
    L.circleMarker(latlng, {
      radius: m.radius || 8,
      color: m.color || '#3388ff',
      fillColor: m.fillColor || m.color || '#3388ff',
      fillOpacity: m.fillOpacity ?? 0.5,
      weight: m.weight ?? 2,
    }).addTo(map).bindPopup(m.popup || '');
  }

  return () => { map.remove(); };
}
