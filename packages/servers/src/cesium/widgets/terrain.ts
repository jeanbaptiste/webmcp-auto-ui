// @ts-nocheck
import { createViewer } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  try {
    if (params?.url) {
      // generic terrain provider URL
      viewer.terrainProvider = new Cesium.CesiumTerrainProvider({ url: params.url });
    } else if (params?.ellipsoid !== false) {
      // explicit flat (ellipsoid) terrain — default
      viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
    }
  } catch {
    // ignore — Cesium World Terrain requires Ion token; fallback is ellipsoid
  }

  // Optional: enable terrain depth-test so entities clamp visually
  try {
    viewer.scene.globe.depthTestAgainstTerrain = Boolean(params?.depthTest ?? true);
  } catch {
    // ignore
  }

  return cleanup;
}
