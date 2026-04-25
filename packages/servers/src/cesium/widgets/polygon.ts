// @ts-nocheck
import { createViewer, renderEmpty, toFlatDegrees, cssColor } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const ring = Array.isArray(params?.ring) ? params.ring : [];
  if (ring.length < 3) return renderEmpty(container, 'cesium-polygon', 'Pass <code>ring: [[lon, lat], ...]</code> with at least 3 points');

  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);
  const flat = toFlatDegrees(ring);
  const fill = Cesium.Color.fromCssColorString(cssColor(params?.color, '#a855f7')).withAlpha(Number(params?.alpha ?? 0.55));
  const extrudedHeight = Number(params?.extrudedHeight ?? 0);

  viewer.entities.add({
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(flat),
      material: fill,
      extrudedHeight: extrudedHeight > 0 ? extrudedHeight : undefined,
      outline: true,
      outlineColor: Cesium.Color.WHITE,
    },
  });

  try { viewer.zoomTo(viewer.entities); } catch { /* ignore */ }
  return cleanup;
}
