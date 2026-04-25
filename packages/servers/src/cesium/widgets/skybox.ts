// @ts-nocheck
import { createViewer } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  try {
    if (params?.sources && typeof params.sources === 'object') {
      // sources expected: { positiveX, negativeX, positiveY, negativeY, positiveZ, negativeZ }
      viewer.scene.skyBox = new Cesium.SkyBox({ sources: params.sources });
    }
    if (viewer.scene.skyBox) viewer.scene.skyBox.show = Boolean(params?.show ?? true);
    if (viewer.scene.sun) viewer.scene.sun.show = Boolean(params?.sun ?? true);
    if (viewer.scene.moon) viewer.scene.moon.show = Boolean(params?.moon ?? true);
    viewer.scene.backgroundColor = params?.backgroundColor
      ? Cesium.Color.fromCssColorString(String(params.backgroundColor))
      : Cesium.Color.BLACK;
  } catch {
    // ignore
  }

  return cleanup;
}
