// @ts-nocheck
import { createDeckMap, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { tileUrl, center = [0, 30], zoom = 3, style, pitch = 0, minZoom = 0, maxZoom = 19, opacity = 1 } = data as any;
  if (!tileUrl) return renderEmpty(container, 'deckgl-tile', 'Provide <code>{tileUrl: "https://.../{z}/{x}/{y}.png"}</code>.');

  const { TileLayer } = await import('@deck.gl/geo-layers');
  const { BitmapLayer } = await import('@deck.gl/layers');

  const layer = new TileLayer({
    id: 'tile',
    data: tileUrl,
    minZoom,
    maxZoom,
    tileSize: 256,
    opacity,
    renderSubLayers: (props: any) => {
      const { boundingBox } = props.tile;
      const [[west, south], [east, north]] = boundingBox;
      return new BitmapLayer(props, {
        data: null,
        image: props.data,
        bounds: [west, south, east, north],
      });
    },
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
