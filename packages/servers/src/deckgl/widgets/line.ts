// @ts-nocheck
import { createDeckMap, toRGBA, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const lines = (data as any).lines ?? (data as any).data ?? (Array.isArray(data) ? data : []);
  if (!Array.isArray(lines) || !lines.length) {
    return renderEmpty(container, 'deckgl-line', 'Provide <code>{lines: [{from: [lng,lat], to: [lng,lat], color?, width?}]}</code>.');
  }
  const { center = lines[0].from ?? [0, 0], zoom = 3, style, pitch = 0, color } = data as any;
  const fallback = toRGBA(color, [40, 110, 230, 220]);

  const { LineLayer } = await import('@deck.gl/layers');
  const layer = new LineLayer({
    id: 'lines',
    data: lines,
    getSourcePosition: (d: any) => d.from ?? d.source,
    getTargetPosition: (d: any) => d.to ?? d.target,
    getColor: (d: any) => (d.color ? toRGBA(d.color, fallback) : fallback),
    getWidth: (d: any) => d.width ?? 2,
    widthUnits: 'pixels',
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
