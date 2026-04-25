// @ts-nocheck
import { createDeckMap, toRGBA, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const cells = (data as any).cells ?? (data as any).data ?? (Array.isArray(data) ? data : []);
  if (!Array.isArray(cells) || !cells.length) {
    return renderEmpty(container, 'deckgl-h3-hexagon', 'Provide <code>{cells: [{hex: "8928308280fffff", value?, color?}]}</code>.');
  }
  const { center = [0, 0], zoom = 8, style, pitch = 30, extruded = false, elevationScale = 20, fillColor } = data as any;
  const fb = toRGBA(fillColor, [70, 140, 230, 180]);

  const { H3HexagonLayer } = await import('@deck.gl/geo-layers');
  const layer = new H3HexagonLayer({
    id: 'h3-hex',
    data: cells,
    getHexagon: (d: any) => d.hex ?? d.h3 ?? d.id,
    getFillColor: (d: any) => (d.color ? toRGBA(d.color, fb) : fb),
    getElevation: (d: any) => d.elevation ?? d.value ?? 0,
    extruded,
    elevationScale,
    pickable: true,
    stroked: true,
    lineWidthMinPixels: 1,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
