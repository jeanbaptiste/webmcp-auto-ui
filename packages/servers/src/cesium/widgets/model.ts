// @ts-nocheck
import { createViewer, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const url = params?.url;
  if (!url) return renderEmpty(container, 'cesium-model', 'Pass <code>url</code> to a glTF/glb model and <code>longitude</code>, <code>latitude</code>');

  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);
  const lon = Number(params?.longitude ?? 0);
  const lat = Number(params?.latitude ?? 0);
  const height = Number(params?.height ?? 0);
  const heading = Number(params?.heading ?? 0);
  const pitch = Number(params?.pitch ?? 0);
  const roll = Number(params?.roll ?? 0);

  const position = Cesium.Cartesian3.fromDegrees(lon, lat, height);
  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(heading),
    Cesium.Math.toRadians(pitch),
    Cesium.Math.toRadians(roll),
  );
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

  viewer.entities.add({
    position,
    orientation,
    model: {
      uri: url,
      scale: Number(params?.scale ?? 1),
      minimumPixelSize: 64,
    },
  });

  try { viewer.zoomTo(viewer.entities); } catch { /* ignore */ }
  return cleanup;
}
