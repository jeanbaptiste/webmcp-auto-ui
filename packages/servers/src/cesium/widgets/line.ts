// @ts-nocheck
import { createViewer, renderEmpty, toFlatDegreesHeights, cssColor } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const path = Array.isArray(params?.path) ? params.path : [];
  if (path.length < 2) return renderEmpty(container, 'cesium-line', 'Pass <code>path: [[lon, lat, height?], ...]</code> with at least 2 points');

  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);
  const flat = toFlatDegreesHeights(path);
  const color = Cesium.Color.fromCssColorString(cssColor(params?.color, '#f97316'));
  const width = Number(params?.width ?? 3);

  viewer.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(flat),
      width,
      material: color,
      clampToGround: Boolean(params?.clampToGround ?? false),
    },
  });

  try { viewer.zoomTo(viewer.entities); } catch { /* ignore */ }
  return cleanup;
}
