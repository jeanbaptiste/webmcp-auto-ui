// @ts-nocheck
import { createDeckMap, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const points = (data as any).points ?? (data as any).data ?? (Array.isArray(data) ? data : []);
  const scenegraph = (data as any).scenegraph ?? (data as any).model;
  if (!Array.isArray(points) || !points.length || !scenegraph) {
    return renderEmpty(container, 'deckgl-scenegraph', 'Provide <code>{points: [{lng, lat, orientation?}], scenegraph: "url-to-glb"}</code>.');
  }
  const { center = [points[0].lng, points[0].lat], zoom = 12, style, pitch = 45, sizeScale = 100 } = data as any;

  const { ScenegraphLayer } = await import('@deck.gl/mesh-layers');
  const layer = new ScenegraphLayer({
    id: 'scenegraph',
    data: points,
    scenegraph,
    getPosition: (d: any) => [d.lng, d.lat, d.altitude ?? 0],
    getOrientation: (d: any) => d.orientation ?? [0, 0, 90],
    sizeScale,
    _animations: { '*': { speed: 1 } },
    _lighting: 'pbr',
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
