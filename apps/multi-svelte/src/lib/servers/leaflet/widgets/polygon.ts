// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 10, latlngs = [], color = '#3388ff', fillColor, fillOpacity = 0.3, weight = 2 } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  if (latlngs.length > 0) {
    const poly = L.polygon(latlngs, {
      color,
      fillColor: fillColor || color,
      fillOpacity,
      weight,
    }).addTo(map);
    map.fitBounds(poly.getBounds());
  }

  return () => { map.remove(); };
}
