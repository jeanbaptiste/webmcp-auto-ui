// @ts-nocheck
import { createMap } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  // Supports the two built-in OL projections without needing proj4 registration.
  const { projection = 'EPSG:4326', center = [0, 0], zoom = 2 } = (data ?? {}) as any;
  const TileLayer = (await import('ol/layer/Tile')).default;
  const OSM = (await import('ol/source/OSM')).default;
  const layers = projection === 'EPSG:3857' ? [new TileLayer({ source: new OSM() })] : [];
  const { cleanup } = await createMap(container, { center, zoom, projection, layers });
  return cleanup;
}
