// @ts-nocheck
import { createViewer, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const url = params?.url;
  const ionAssetId = params?.ionAssetId;
  if (!url && !ionAssetId) {
    return renderEmpty(
      container,
      'cesium-3d-tiles',
      'Pass <code>url</code> to a tileset.json or <code>ionAssetId</code> (Ion access token required for Ion assets).',
    );
  }

  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  try {
    let tileset: any;
    if (ionAssetId) {
      tileset = await Cesium.Cesium3DTileset.fromIonAssetId(Number(ionAssetId));
    } else {
      tileset = await Cesium.Cesium3DTileset.fromUrl(url);
    }
    viewer.scene.primitives.add(tileset);
    if (params?.zoomTo !== false) viewer.zoomTo(tileset);
  } catch (e) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;top:8px;left:8px;background:#fff5f5;color:#933;padding:8px;border:1px dashed #c66;border-radius:6px;font:12px system-ui;z-index:10';
    overlay.textContent = `3D Tiles load error: ${(e as Error).message}. Note: Ion assets require an access token.`;
    container.appendChild(overlay);
  }

  return cleanup;
}
