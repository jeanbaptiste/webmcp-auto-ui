// @ts-nocheck
import { createMap, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { url, center, zoom, attributions, maxZoom = 19 } = (data ?? {}) as any;
  if (!url) return renderEmpty(container, 'openlayers-xyz', 'Pass a `url` template like `https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png`.');
  const TileLayer = (await import('ol/layer/Tile')).default;
  const XYZ = (await import('ol/source/XYZ')).default;
  const layers = [new TileLayer({ source: new XYZ({ url, attributions, maxZoom }) })];
  const { cleanup } = await createMap(container, { center, zoom, layers });
  return cleanup;
}
