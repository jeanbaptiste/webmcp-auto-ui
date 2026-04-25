// @ts-nocheck
import { createViewer } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const provider = String(params?.provider ?? 'osm').toLowerCase();
  const { Cesium, viewer, cleanup } = await createViewer(container, { ...params?.viewerOptions, useOSM: false });

  try {
    let imagery: any = null;
    if (provider === 'osm') {
      imagery = new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' });
    } else if (provider === 'opentopomap' || provider === 'topo') {
      imagery = new Cesium.OpenStreetMapImageryProvider({ url: 'https://a.tile.opentopomap.org/' });
    } else if (provider === 'cartolight' || provider === 'positron') {
      imagery = new Cesium.UrlTemplateImageryProvider({
        url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        credit: '© CARTO © OpenStreetMap',
      });
    } else if (provider === 'cartodark' || provider === 'darkmatter') {
      imagery = new Cesium.UrlTemplateImageryProvider({
        url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        credit: '© CARTO © OpenStreetMap',
      });
    } else if (provider === 'esri' || provider === 'esri-world') {
      imagery = new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri',
      });
    } else if (provider === 'url' && params?.url) {
      imagery = new Cesium.UrlTemplateImageryProvider({ url: String(params.url) });
    } else {
      imagery = new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' });
    }

    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(imagery);
  } catch {
    // ignore — viewer will fall back to default
  }

  return cleanup;
}
