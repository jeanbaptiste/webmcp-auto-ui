// @ts-nocheck
import { createViewer, renderEmpty, cssColor } from './shared.js';

/**
 * Render a heat-projection-style map: array of {longitude, latitude, value}
 * becomes color-graded ellipsoid markers whose color reflects a normalized value.
 */
export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const points = Array.isArray(params?.points) ? params.points : [];
  if (points.length === 0) return renderEmpty(container, 'cesium-heightmap', 'Pass <code>points: [{longitude, latitude, value}]</code>');

  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  const values = points.map((p: any) => Number(p?.value ?? 0)).filter((v: number) => Number.isFinite(v));
  const vmin = Math.min(...values);
  const vmax = Math.max(...values);
  const span = vmax - vmin || 1;

  const colorLow = Cesium.Color.fromCssColorString(cssColor(params?.colorLow, '#1e3a8a'));
  const colorHigh = Cesium.Color.fromCssColorString(cssColor(params?.colorHigh, '#dc2626'));

  for (const p of points) {
    const lon = Number(p?.longitude ?? p?.lon);
    const lat = Number(p?.latitude ?? p?.lat);
    const value = Number(p?.value ?? 0);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    const t = (value - vmin) / span;
    const color = Cesium.Color.lerp(colorLow, colorHigh, t, new Cesium.Color());
    color.alpha = 0.8;
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
      ellipse: {
        semiMinorAxis: Number(params?.radius ?? 50_000),
        semiMajorAxis: Number(params?.radius ?? 50_000),
        material: color,
        height: 0,
      },
    });
  }

  try { viewer.zoomTo(viewer.entities); } catch { /* ignore */ }
  return cleanup;
}
