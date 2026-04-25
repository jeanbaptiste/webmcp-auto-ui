// @ts-nocheck
import { createViewer } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  try {
    viewer.shadows = Boolean(params?.shadows ?? true);
    viewer.terrainShadows = params?.terrainShadows
      ? Cesium.ShadowMode.ENABLED
      : Cesium.ShadowMode.RECEIVE_ONLY;
    if (params?.time) {
      viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(String(params.time));
    }
    viewer.scene.globe.enableLighting = Boolean(params?.lighting ?? true);
  } catch {
    // ignore
  }

  // sample marker so the shadow has something to cast (optional)
  if (params?.sample !== false) {
    try {
      const lon = Number(params?.longitude ?? 2.3522);
      const lat = Number(params?.latitude ?? 48.8566);
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 50_000),
        ellipsoid: {
          radii: new Cesium.Cartesian3(20_000, 20_000, 20_000),
          material: Cesium.Color.ORANGE,
          shadows: Cesium.ShadowMode.ENABLED,
        },
      });
      viewer.zoomTo(viewer.entities);
    } catch {
      // ignore
    }
  }

  return cleanup;
}
