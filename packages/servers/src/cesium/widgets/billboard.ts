// @ts-nocheck
import { createViewer, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const billboards = Array.isArray(params?.billboards) ? params.billboards : [];
  if (billboards.length === 0) return renderEmpty(container, 'cesium-billboard', 'Pass <code>billboards: [{longitude, latitude, image}]</code>');

  const { Cesium, viewer, cleanup } = await createViewer(container, params?.viewerOptions);

  for (const b of billboards) {
    const lon = Number(b?.longitude ?? b?.lon);
    const lat = Number(b?.latitude ?? b?.lat);
    const h = Number(b?.height ?? 0);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, h),
      billboard: {
        image: b?.image ?? 'https://cdn.jsdelivr.net/gh/CesiumGS/cesium@1/Apps/SampleData/Images/Cesium_Logo_overlay.png',
        scale: Number(b?.scale ?? 0.4),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      },
      label: b?.label
        ? {
            text: String(b.label),
            font: '12px system-ui, sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -36),
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          }
        : undefined,
    });
  }

  try { viewer.zoomTo(viewer.entities); } catch { /* ignore */ }
  return cleanup;
}
