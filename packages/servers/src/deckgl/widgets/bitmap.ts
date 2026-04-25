// @ts-nocheck
import { createDeckMap, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { image, bounds, center, zoom = 5, style, pitch = 0, opacity = 1 } = data as any;
  if (!image || !bounds || !Array.isArray(bounds) || bounds.length !== 4) {
    return renderEmpty(container, 'deckgl-bitmap', 'Provide <code>{image: "url", bounds: [west, south, east, north]}</code>.');
  }
  const resolvedCenter = center ?? [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];

  const { BitmapLayer } = await import('@deck.gl/layers');
  const layer = new BitmapLayer({
    id: 'bitmap',
    image,
    bounds,
    opacity,
  });

  const { cleanup } = await createDeckMap(container, {
    center: resolvedCenter,
    zoom,
    style,
    pitch,
    layers: [layer],
  });
  return cleanup;
}
