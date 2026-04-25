// @ts-nocheck
import { createMap } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { center, zoom, showLabels = true } = (data ?? {}) as any;
  const Graticule = (await import('ol/layer/Graticule')).default;
  const { Stroke } = await import('ol/style');
  const layer = new Graticule({
    showLabels,
    strokeStyle: new Stroke({ color: 'rgba(60,60,60,0.6)', width: 1, lineDash: [2, 4] }),
    wrapX: false,
  });
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  return cleanup;
}
