// @ts-nocheck
import { createViewer } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  const lon = Number(params?.longitude ?? 2.3522);
  const lat = Number(params?.latitude ?? 48.8566);
  const height = Number(params?.height ?? 4_000_000);
  const heading = Number(params?.heading ?? 0);
  const pitch = Number(params?.pitch ?? -45);
  const duration = Number(params?.duration ?? 3);

  try {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
      orientation: {
        heading: Cesium.Math.toRadians(heading),
        pitch: Cesium.Math.toRadians(pitch),
        roll: 0,
      },
      duration,
    });
  } catch {
    // ignore
  }

  return cleanup;
}
