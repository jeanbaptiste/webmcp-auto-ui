// @ts-nocheck
import { createViewer, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const source = params?.url ?? params?.czml;
  if (!source) return renderEmpty(container, 'cesium-czml', 'Pass <code>url</code> to a CZML doc, or inline <code>czml</code> array');

  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  try {
    const ds = await Cesium.CzmlDataSource.load(source);
    await viewer.dataSources.add(ds);
    if (params?.zoomTo !== false) viewer.zoomTo(ds);
  } catch (e) {
    // surface error in UI but keep viewer alive
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;top:8px;left:8px;background:#fff5f5;color:#933;padding:8px;border:1px dashed #c66;border-radius:6px;font:12px system-ui;z-index:10';
    overlay.textContent = `CZML load error: ${(e as Error).message}`;
    container.appendChild(overlay);
  }

  return cleanup;
}
