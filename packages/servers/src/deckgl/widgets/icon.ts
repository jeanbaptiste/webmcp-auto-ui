// @ts-nocheck
import { createDeckMap, toPoints, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const points = toPoints(data);
  if (!points.length) return renderEmpty(container, 'deckgl-icon', 'Provide <code>{points: [{lng, lat, icon?}], iconUrl: "..."}</code>.');

  const { center, zoom = 4, style, pitch = 0, iconUrl, sizeScale = 24 } = data as any;
  const resolvedCenter = center ?? [points[0].lng, points[0].lat];
  // Default icon: a simple circle data URI if none provided
  const defaultIcon =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="20" fill="%23e74c3c" stroke="white" stroke-width="3"/></svg>',
    );

  const { IconLayer } = await import('@deck.gl/layers');
  const layer = new IconLayer({
    id: 'icons',
    data: points,
    getIcon: () => ({
      url: iconUrl ?? defaultIcon,
      width: 48,
      height: 48,
      anchorY: 48,
    }),
    getPosition: (d: any) => [d.lng, d.lat],
    getSize: (d: any) => d.size ?? 1,
    sizeScale,
    sizeUnits: 'pixels',
    pickable: true,
  });

  const { cleanup } = await createDeckMap(container, {
    center: resolvedCenter,
    zoom,
    style,
    pitch,
    layers: [layer],
  });
  return cleanup;
}
