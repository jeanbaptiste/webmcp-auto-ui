// @ts-nocheck
import { createViewer, renderEmpty, cssColor } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const points = Array.isArray(params?.points) ? params.points : [];
  if (points.length === 0) return renderEmpty(container, 'cesium-points', 'Pass <code>points: [[lon, lat, height?], ...]</code>');

  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);
  const color = Cesium.Color.fromCssColorString(cssColor(params?.color, '#22d3ee'));
  const size = Number(params?.size ?? 6);

  for (const p of points) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const [lon, lat, h = 0] = p;
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(Number(lon), Number(lat), Number(h)),
      point: { pixelSize: size, color },
    });
  }

  try { viewer.zoomTo(viewer.entities); } catch { /* ignore */ }
  return cleanup;
}
