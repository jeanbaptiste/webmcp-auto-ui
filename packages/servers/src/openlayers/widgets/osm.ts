// @ts-nocheck
import { createMap } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { center, zoom } = (data ?? {}) as any;
  const TileLayer = (await import('ol/layer/Tile')).default;
  const OSM = (await import('ol/source/OSM')).default;
  const layers = [new TileLayer({ source: new OSM() })];
  const { cleanup } = await createMap(container, { center, zoom, layers });
  return cleanup;
}
