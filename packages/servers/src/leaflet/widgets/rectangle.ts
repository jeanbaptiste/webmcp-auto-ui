// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 10, bounds, color = '#3388ff', fillColor, fillOpacity = 0.3, weight = 2 } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  if (bounds) {
    const rect = L.rectangle(bounds, {
      color,
      fillColor: fillColor || color,
      fillOpacity,
      weight,
    }).addTo(map);
    map.fitBounds(rect.getBounds());
  }

  return () => { map.remove(); };
}
