// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 10, features = [] } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  const fg = L.featureGroup();

  for (const f of features) {
    if (f.type === 'marker') {
      L.marker(f.latlng || center).bindPopup(f.popup || '').addTo(fg);
    } else if (f.type === 'circle') {
      L.circle(f.latlng || center, { radius: f.radius || 300, color: f.color || '#3388ff' }).addTo(fg);
    } else if (f.type === 'polygon') {
      L.polygon(f.latlngs || []).addTo(fg);
    } else if (f.type === 'polyline') {
      L.polyline(f.latlngs || [], { color: f.color || '#3388ff' }).addTo(fg);
    }
  }

  fg.addTo(map);
  if (features.length > 0) {
    try { map.fitBounds(fg.getBounds()); } catch (e) { /* empty group */ }
  }

  return () => { map.remove(); };
}
