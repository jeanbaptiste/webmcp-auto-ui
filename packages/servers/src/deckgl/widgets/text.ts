// @ts-nocheck
import { createDeckMap, toRGBA, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const labels = (data as any).labels ?? (data as any).data ?? (Array.isArray(data) ? data : []);
  if (!Array.isArray(labels) || !labels.length) {
    return renderEmpty(container, 'deckgl-text', 'Provide <code>{labels: [{lng, lat, text, color?, size?}]}</code>.');
  }
  const first = labels[0];
  const { center = [first.lng, first.lat], zoom = 4, style, pitch = 0, color, sizeScale = 1 } = data as any;
  const fb = toRGBA(color, [30, 30, 30, 255]);

  const { TextLayer } = await import('@deck.gl/layers');
  const layer = new TextLayer({
    id: 'text',
    data: labels,
    getPosition: (d: any) => [d.lng, d.lat],
    getText: (d: any) => String(d.text ?? d.label ?? ''),
    getColor: (d: any) => (d.color ? toRGBA(d.color, fb) : fb),
    getSize: (d: any) => d.size ?? 14,
    sizeScale,
    sizeUnits: 'pixels',
    background: true,
    backgroundPadding: [4, 2],
    getBackgroundColor: [255, 255, 255, 200],
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 600,
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, { center, zoom, style, pitch, layers: [layer] });
  return cleanup;
}
