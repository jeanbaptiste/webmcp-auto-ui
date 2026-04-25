// @ts-nocheck
import { createDeckMap, toRGBA, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const points = (data as any).points ?? (data as any).data ?? (Array.isArray(data) ? data : []);
  if (!Array.isArray(points) || !points.length) {
    return renderEmpty(container, 'deckgl-simple-mesh', 'Provide <code>{points: [{lng, lat, color?, orientation?}], shape?: "cube"|"sphere"|"cone", sizeScale?}</code>.');
  }
  const { center = [points[0].lng, points[0].lat], zoom = 12, style, pitch = 45, shape = 'cube', sizeScale = 100, color } = data as any;
  const fb = toRGBA(color, [200, 80, 80, 255]);

  const { SimpleMeshLayer } = await import('@deck.gl/mesh-layers');
  const { CubeGeometry, SphereGeometry, ConeGeometry } = await import('@luma.gl/engine').catch(() => ({})) as any;

  let mesh: any;
  if (shape === 'sphere' && SphereGeometry) mesh = new SphereGeometry({ radius: 1, nlat: 12, nlong: 12 });
  else if (shape === 'cone' && ConeGeometry) mesh = new ConeGeometry({ radius: 1, height: 2 });
  else if (CubeGeometry) mesh = new CubeGeometry();
  else {
    // Fallback: simple cube vertices (no luma.gl/engine available)
    mesh = {
      positions: new Float32Array([
        -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1,
        -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
      ]),
      indices: new Uint16Array([
        0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 3,
        1, 5, 6, 1, 6, 2, 3, 2, 6, 3, 6, 7, 0, 1, 5, 0, 5, 4,
      ]),
    };
  }

  const layer = new SimpleMeshLayer({
    id: 'simple-mesh',
    data: points,
    mesh,
    getPosition: (d: any) => [d.lng, d.lat, d.altitude ?? 0],
    getColor: (d: any) => (d.color ? toRGBA(d.color, fb) : fb),
    getOrientation: (d: any) => d.orientation ?? [0, 0, 0],
    sizeScale,
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
