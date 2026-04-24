// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center, zoom = 11, style = 'voyager', markers = [] } = data as any;
  const first = markers[0];
  const resolvedCenter = center ?? (first ? [first.lng, first.lat] : [2.3522, 48.8566]);
  const { maplibre, map, cleanup } = await createMap(container, { center: resolvedCenter, zoom, style });

  map.on('load', () => {
    for (const m of markers) {
      const marker = new maplibre.Marker({ color: m.color ?? '#e74c3c' })
        .setLngLat([m.lng, m.lat])
        .addTo(map);
      if (m.popup) {
        const popup = new maplibre.Popup({ offset: 25 }).setHTML(m.popup);
        marker.setPopup(popup);
      }
    }
  });

  return cleanup;
}
