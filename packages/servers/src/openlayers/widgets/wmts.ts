// @ts-nocheck
import { createMap, renderEmpty } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { capabilitiesUrl, layer: layerName, matrixSet, center, zoom } = (data ?? {}) as any;
  if (!capabilitiesUrl || !layerName) {
    return renderEmpty(container, 'openlayers-wmts', 'Pass `capabilitiesUrl` (WMTS GetCapabilities) and `layer` name.');
  }
  const TileLayer = (await import('ol/layer/Tile')).default;
  const WMTS = (await import('ol/source/WMTS')).default;
  const optionsFromCapabilities = (await import('ol/source/WMTS')).optionsFromCapabilities;
  const WMTSCapabilities = (await import('ol/format/WMTSCapabilities')).default;

  const res = await fetch(capabilitiesUrl);
  const text = await res.text();
  const parser = new WMTSCapabilities();
  const capabilities = parser.read(text);
  const opts = optionsFromCapabilities(capabilities, { layer: layerName, matrixSet });
  if (!opts) return renderEmpty(container, 'openlayers-wmts', `Layer "${layerName}" not found in capabilities.`);
  const tile = new TileLayer({ source: new WMTS(opts) });
  const { map, cleanup } = await createMap(container, { center, zoom });
  map.addLayer(tile);
  return cleanup;
}
