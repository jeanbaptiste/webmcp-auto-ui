// @ts-nocheck
import { createMap } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { center, zoom } = (data ?? {}) as any;
  const TileLayer = (await import('ol/layer/Tile')).default;
  const OSM = (await import('ol/source/OSM')).default;
  const OverviewMap = (await import('ol/control/OverviewMap')).default;

  const { map, cleanup } = await createMap(container, { center, zoom });
  const overview = new OverviewMap({
    layers: [new TileLayer({ source: new OSM() })],
    collapsed: false,
  });
  map.addControl(overview);
  return cleanup;
}
