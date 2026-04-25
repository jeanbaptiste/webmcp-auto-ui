// @ts-nocheck
import { createViewer, renderEmpty, cssColor } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const source = params?.url ?? params?.geojson;
  if (!source) return renderEmpty(container, 'cesium-geojson', 'Pass <code>url</code> to a GeoJSON file or inline <code>geojson</code> object');

  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  try {
    const ds = await Cesium.GeoJsonDataSource.load(source, {
      stroke: Cesium.Color.fromCssColorString(cssColor(params?.stroke, '#0ea5e9')),
      fill: Cesium.Color.fromCssColorString(cssColor(params?.fill, '#0ea5e9')).withAlpha(Number(params?.fillAlpha ?? 0.45)),
      strokeWidth: Number(params?.strokeWidth ?? 2),
      clampToGround: Boolean(params?.clampToGround ?? true),
    });
    await viewer.dataSources.add(ds);
    if (params?.zoomTo !== false) viewer.zoomTo(ds);
  } catch (e) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;top:8px;left:8px;background:#fff5f5;color:#933;padding:8px;border:1px dashed #c66;border-radius:6px;font:12px system-ui;z-index:10';
    overlay.textContent = `GeoJSON load error: ${(e as Error).message}`;
    container.appendChild(overlay);
  }

  return cleanup;
}
