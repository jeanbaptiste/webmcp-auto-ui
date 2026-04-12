// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 10, videoUrl, bounds, opacity = 0.7, autoplay = true, loop = true, muted = true } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  if (videoUrl && bounds) {
    const video = L.videoOverlay(videoUrl, bounds, {
      opacity,
      autoplay,
      loop,
      muted,
    }).addTo(map);
    map.fitBounds(bounds);
  }

  return () => { map.remove(); };
}
