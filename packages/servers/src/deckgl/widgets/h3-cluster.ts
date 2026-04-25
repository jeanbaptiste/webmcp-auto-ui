// @ts-nocheck
import { createDeckMap, toRGBA, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const clusters = (data as any).clusters ?? (data as any).data ?? (Array.isArray(data) ? data : []);
  if (!Array.isArray(clusters) || !clusters.length) {
    return renderEmpty(container, 'deckgl-h3-cluster', 'Provide <code>{clusters: [{hexagons: ["...", "..."], color?}]}</code>.');
  }
  const { center = [0, 0], zoom = 6, style, pitch = 0, fillColor } = data as any;
  const fb = toRGBA(fillColor, [120, 80, 200, 180]);

  const { H3ClusterLayer } = await import('@deck.gl/geo-layers');
  const layer = new H3ClusterLayer({
    id: 'h3-cluster',
    data: clusters,
    getHexagons: (d: any) => d.hexagons ?? d.hexes ?? [],
    getFillColor: (d: any) => (d.color ? toRGBA(d.color, fb) : fb),
    getLineColor: [255, 255, 255, 200],
    lineWidthMinPixels: 1,
    stroked: true,
    filled: true,
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
