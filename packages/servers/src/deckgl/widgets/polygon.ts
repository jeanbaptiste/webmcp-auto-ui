// @ts-nocheck
import { createDeckMap, toRGBA, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const polygons = (data as any).polygons ?? (data as any).data ?? (Array.isArray(data) ? data : []);
  if (!Array.isArray(polygons) || !polygons.length) {
    return renderEmpty(container, 'deckgl-polygon', 'Provide <code>{polygons: [{polygon: [[lng,lat], ...], elevation?, fillColor?, lineColor?}]}</code>.');
  }
  const { center = [0, 0], zoom = 3, style, pitch = 30, extruded = false, fillColor, lineColor } = data as any;
  const fillFb = toRGBA(fillColor, [60, 130, 230, 160]);
  const lineFb = toRGBA(lineColor, [40, 60, 100, 220]);

  const { PolygonLayer } = await import('@deck.gl/layers');
  const layer = new PolygonLayer({
    id: 'polygons',
    data: polygons,
    getPolygon: (d: any) => d.polygon ?? d.contour ?? d,
    getFillColor: (d: any) => (d.fillColor ? toRGBA(d.fillColor, fillFb) : fillFb),
    getLineColor: (d: any) => (d.lineColor ? toRGBA(d.lineColor, lineFb) : lineFb),
    getElevation: (d: any) => d.elevation ?? 0,
    extruded,
    wireframe: !!(data as any).wireframe,
    lineWidthMinPixels: 1,
    stroked: true,
    filled: true,
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
