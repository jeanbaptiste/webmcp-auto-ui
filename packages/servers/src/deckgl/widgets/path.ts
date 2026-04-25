// @ts-nocheck
import { createDeckMap, toRGBA, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const paths = (data as any).paths ?? (data as any).data ?? (Array.isArray(data) ? data : []);
  if (!Array.isArray(paths) || !paths.length) {
    return renderEmpty(container, 'deckgl-path', 'Provide <code>{paths: [{path: [[lng,lat], ...], color?, width?}]}</code>.');
  }
  const first = paths[0];
  const firstCoord = Array.isArray(first?.path) ? first.path[0] : Array.isArray(first) ? first[0] : null;
  const { center = firstCoord ?? [0, 0], zoom = 4, style, pitch = 0, color } = data as any;
  const fallback = toRGBA(color, [230, 90, 60, 230]);

  const { PathLayer } = await import('@deck.gl/layers');
  const layer = new PathLayer({
    id: 'paths',
    data: paths,
    getPath: (d: any) => d.path ?? d,
    getColor: (d: any) => (d.color ? toRGBA(d.color, fallback) : fallback),
    getWidth: (d: any) => d.width ?? 5,
    widthUnits: 'pixels',
    widthMinPixels: 1,
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
