// @ts-nocheck
import { createViewer } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  try {
    const globe = viewer.scene.globe;
    globe.showGroundAtmosphere = Boolean(params?.groundAtmosphere ?? true);
    globe.enableLighting = Boolean(params?.lighting ?? true);
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = Boolean(params?.skyAtmosphere ?? true);
      if (params?.hueShift != null) viewer.scene.skyAtmosphere.hueShift = Number(params.hueShift);
      if (params?.saturationShift != null) viewer.scene.skyAtmosphere.saturationShift = Number(params.saturationShift);
      if (params?.brightnessShift != null) viewer.scene.skyAtmosphere.brightnessShift = Number(params.brightnessShift);
    }
    viewer.scene.fog.enabled = Boolean(params?.fog ?? true);
  } catch {
    // ignore
  }

  return cleanup;
}
