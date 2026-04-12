// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 10, latlngs = [], color = '#3388ff', weight = 3, opacity = 1, dashArray } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  const opts: any = { color, weight, opacity };
  if (dashArray) opts.dashArray = dashArray;

  if (latlngs.length > 0) {
    const line = L.polyline(latlngs, opts).addTo(map);
    map.fitBounds(line.getBounds());
  }

  return () => { map.remove(); };
}
