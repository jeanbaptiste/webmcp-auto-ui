// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 12, circles = [] } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  for (const c of circles) {
    const latlng = c.latlng || c.center || center;
    L.circle(latlng, {
      radius: c.radius || 500,
      color: c.color || '#3388ff',
      fillColor: c.fillColor || c.color || '#3388ff',
      fillOpacity: c.fillOpacity ?? 0.3,
      weight: c.weight ?? 2,
    }).addTo(map);
  }

  if (circles.length === 0) {
    L.circle(center, { radius: 500 }).addTo(map);
  }

  return () => { map.remove(); };
}
