// @ts-nocheck
import { createMap } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { type = 'Point', center, zoom } = (data ?? {}) as any;
  const VectorLayer = (await import('ol/layer/Vector')).default;
  const VectorSource = (await import('ol/source/Vector')).default;
  const Draw = (await import('ol/interaction/Draw')).default;

  const source = new VectorSource();
  const layer = new VectorLayer({ source });
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(layer);
  map.addInteraction(new Draw({ source, type }));
  return cleanup;
}
