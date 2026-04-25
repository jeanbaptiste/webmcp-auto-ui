// @ts-nocheck
import { createDeckMap, toRGBA, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cells = (data as any).cells ?? (data as any).data ?? (Array.isArray(data) ? data : []);
  if (!Array.isArray(cells) || !cells.length) {
    return renderEmpty(container, 'deckgl-s2', 'Provide <code>{cells: [{token: "80858004", value?, color?}]}</code>.');
  }
  const { center = [0, 0], zoom = 6, style, pitch = 30, extruded = false, elevationScale = 20, fillColor } = data as any;
  const fb = toRGBA(fillColor, [70, 200, 140, 180]);

  const { S2Layer } = await import('@deck.gl/geo-layers');
  const layer = new S2Layer({
    id: 's2',
    data: cells,
    getS2Token: (d: any) => d.token ?? d.s2 ?? d.id,
    getFillColor: (d: any) => (d.color ? toRGBA(d.color, fb) : fb),
    getElevation: (d: any) => d.elevation ?? d.value ?? 0,
    extruded,
    elevationScale,
    pickable: true,
    stroked: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
