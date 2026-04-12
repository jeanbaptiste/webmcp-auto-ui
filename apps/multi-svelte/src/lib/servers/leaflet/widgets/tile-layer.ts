// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 13, url, attribution, opacity = 1 } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  if (url) {
    L.tileLayer(url, { attribution: attribution || '', opacity }).addTo(map);
  }

  return () => { map.remove(); };
}
