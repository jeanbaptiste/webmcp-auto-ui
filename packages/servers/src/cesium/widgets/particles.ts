// @ts-nocheck
import { createViewer, cssColor } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  try {
    const lon = Number(params?.longitude ?? 2.3522);
    const lat = Number(params?.latitude ?? 48.8566);
    const height = Number(params?.height ?? 1000);

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, height);
    const modelMatrix = Cesium.Matrix4.fromTranslation(position);

    const particleSystem = viewer.scene.primitives.add(
      new Cesium.ParticleSystem({
        image:
          params?.image ??
          'https://cdn.jsdelivr.net/gh/CesiumGS/cesium@1/Apps/SampleData/smoke.png',
        startColor: Cesium.Color.fromCssColorString(cssColor(params?.startColor, '#ffffff')).withAlpha(0.7),
        endColor: Cesium.Color.fromCssColorString(cssColor(params?.endColor, '#ffaa55')).withAlpha(0),
        startScale: Number(params?.startScale ?? 1.0),
        endScale: Number(params?.endScale ?? 4.0),
        minimumParticleLife: Number(params?.minLife ?? 1.5),
        maximumParticleLife: Number(params?.maxLife ?? 3.0),
        minimumSpeed: Number(params?.minSpeed ?? 5),
        maximumSpeed: Number(params?.maxSpeed ?? 10),
        imageSize: new Cesium.Cartesian2(Number(params?.imageSize ?? 25), Number(params?.imageSize ?? 25)),
        emissionRate: Number(params?.emissionRate ?? 50),
        lifetime: Number(params?.lifetime ?? 16),
        emitter: new Cesium.CircleEmitter(Number(params?.emitterRadius ?? 50)),
        modelMatrix,
      }),
    );

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, height + 5000),
      duration: 0,
    });
    void particleSystem;
  } catch {
    // ignore
  }

  return cleanup;
}
