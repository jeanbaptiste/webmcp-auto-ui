// @ts-nocheck
import { createDeckMap, toRGBA, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const arcs = (data as any).arcs ?? (data as any).data ?? (Array.isArray(data) ? data : []);
  if (!Array.isArray(arcs) || !arcs.length) {
    return renderEmpty(container, 'deckgl-arc', 'Provide <code>{arcs: [{from: [lng,lat], to: [lng,lat], sourceColor?, targetColor?, width?}]}</code>.');
  }
  const { center = arcs[0].from ?? [0, 0], zoom = 3, style, pitch = 30 } = data as any;

  const { ArcLayer } = await import('@deck.gl/layers');
  const layer = new ArcLayer({
    id: 'arcs',
    data: arcs,
    getSourcePosition: (d: any) => d.from ?? d.source,
    getTargetPosition: (d: any) => d.to ?? d.target,
    getSourceColor: (d: any) => toRGBA(d.sourceColor, [50, 120, 230, 220]),
    getTargetColor: (d: any) => toRGBA(d.targetColor, [230, 70, 110, 220]),
    getWidth: (d: any) => d.width ?? 2,
    getHeight: (d: any) => d.height ?? 1,
    greatCircle: !!(data as any).greatCircle,
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
