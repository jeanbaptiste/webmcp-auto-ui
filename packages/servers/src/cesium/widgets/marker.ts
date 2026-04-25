// @ts-nocheck
import { createViewer, renderEmpty, cssColor } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const markers = Array.isArray(params?.markers) ? params.markers : [];
  if (markers.length === 0) return renderEmpty(container, 'cesium-marker', 'Pass <code>markers: [{longitude, latitude, label?}]</code>');

  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  for (const m of markers) {
    const lon = Number(m?.longitude ?? m?.lon ?? m?.[0]);
    const lat = Number(m?.latitude ?? m?.lat ?? m?.[1]);
    const h = Number(m?.height ?? m?.[2] ?? 0);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, h),
      point: {
        pixelSize: Number(m?.size ?? 12),
        color: Cesium.Color.fromCssColorString(cssColor(m?.color, '#ef4444')),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
      },
      label: m?.label
        ? {
            text: String(m.label),
            font: '13px system-ui, sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -18),
          }
        : undefined,
    });
  }

  try { viewer.zoomTo(viewer.entities); } catch { /* ignore */ }
  return cleanup;
}
