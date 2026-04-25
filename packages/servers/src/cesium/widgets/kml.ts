// @ts-nocheck
import { createViewer, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const url = params?.url;
  if (!url) return renderEmpty(container, 'cesium-kml', 'Pass <code>url</code> to a KML/KMZ file');

  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  try {
    const ds = await Cesium.KmlDataSource.load(url, {
      camera: viewer.scene.camera,
      canvas: viewer.scene.canvas,
      clampToGround: Boolean(params?.clampToGround ?? true),
    });
    await viewer.dataSources.add(ds);
    if (params?.zoomTo !== false) viewer.zoomTo(ds);
  } catch (e) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;top:8px;left:8px;background:#fff5f5;color:#933;padding:8px;border:1px dashed #c66;border-radius:6px;font:12px system-ui;z-index:10';
    overlay.textContent = `KML load error: ${(e as Error).message}`;
    container.appendChild(overlay);
  }

  return cleanup;
}
