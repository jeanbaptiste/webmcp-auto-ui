// @ts-nocheck
import { createMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [48.8566, 2.3522], zoom = 6, url, layers, format = 'image/png', transparent = true, attribution } = data as any;
  const { L, map } = await createMap(container, { center, zoom });

  if (url && layers) {
    L.tileLayer.wms(url, {
      layers,
      format,
      transparent,
      attribution: attribution || '',
    }).addTo(map);
  }

  return () => { map.remove(); };
}
