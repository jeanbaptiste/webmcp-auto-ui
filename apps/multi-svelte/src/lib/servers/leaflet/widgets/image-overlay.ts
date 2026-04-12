// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 10, imageUrl, bounds, opacity = 0.7 } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  if (imageUrl && bounds) {
    L.imageOverlay(imageUrl, bounds, { opacity }).addTo(map);
    map.fitBounds(bounds);
  }

  return () => { map.remove(); };
}
