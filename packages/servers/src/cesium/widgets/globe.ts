// @ts-nocheck
import { createViewer, toCartesian3 } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  const lon = Number(params?.longitude ?? 2.3522);
  const lat = Number(params?.latitude ?? 48.8566);
  const height = Number(params?.height ?? 10_000_000);

  try {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
      duration: 0,
    });
  } catch {
    // ignore
  }

  return cleanup;
}
