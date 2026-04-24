// @ts-nocheck
import { createMap, whenLoaded } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center, zoom = 14, style = 'positron', url, coordinates, opacity = 0.85 } = data as any;
  if (!url || !coordinates) return;

  const resolvedCenter = center ?? coordinates[0];
  const { map, cleanup } = await createMap(container, { center: resolvedCenter, zoom, style });
  await whenLoaded(map);

  map.addSource('img', { type: 'image', url, coordinates });
  map.addLayer({ id: 'img', type: 'raster', source: 'img', paint: { 'raster-opacity': opacity } });

  return cleanup;
}
