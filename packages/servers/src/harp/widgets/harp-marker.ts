// @ts-nocheck
// ---------------------------------------------------------------------------
// harp-marker — markers at lat/lon positions
// Uses three.js spheres anchored via mapView.geoToWorldCoordinates when
// available, otherwise falls back to overlay HTML pins.
// ---------------------------------------------------------------------------

import {
  appendTitle,
  createMapView,
  renderEmpty,
  tryAddControls,
  tryAddOmvDataSource,
} from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d = data as any;
  const markers: Array<{ lat: number; lon: number; label?: string; color?: string }> =
    Array.isArray(d.markers) ? d.markers : [];

  appendTitle(container, d.title);

  const result = await createMapView(container, {
    center: d.center ?? (markers[0] ? [markers[0].lon, markers[0].lat] : undefined),
    zoom: d.zoom ?? 10,
    tilt: d.tilt ?? 30,
    projection: 'mercator',
  });

  if (!result) return renderEmpty(container, 'harp-marker');

  const { mapView, harp, cleanup } = result;
  tryAddControls(harp, mapView);
  tryAddOmvDataSource(harp, mapView, { apiKey: d.apiKey });

  // Overlay HTML markers — projected each frame via mapView.projectedToScreen
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:absolute;inset:0;pointer-events:none;z-index:2;';
  container.appendChild(overlay);

  const pins: HTMLDivElement[] = markers.map((m) => {
    const pin = document.createElement('div');
    pin.style.cssText = `
      position:absolute;transform:translate(-50%,-100%);
      width:14px;height:14px;border-radius:50% 50% 50% 0;
      background:${m.color ?? '#e53935'};border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);transform-origin:bottom center;
      transform:translate(-50%,-100%) rotate(-45deg);
    `;
    if (m.label) pin.title = m.label;
    overlay.appendChild(pin);
    return pin;
  });

  let raf = 0;
  const updatePins = () => {
    raf = requestAnimationFrame(updatePins);
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i];
      const pin = pins[i];
      try {
        const screen = mapView.getScreenPosition?.({
          latitude: m.lat,
          longitude: m.lon,
          altitude: 0,
        });
        if (screen && Number.isFinite(screen.x) && Number.isFinite(screen.y)) {
          pin.style.left = `${screen.x}px`;
          pin.style.top = `${screen.y}px`;
          pin.style.display = 'block';
        } else {
          pin.style.display = 'none';
        }
      } catch {
        pin.style.display = 'none';
      }
    }
  };
  updatePins();

  const baseCleanup = cleanup;
  return () => {
    cancelAnimationFrame(raf);
    try {
      overlay.remove();
    } catch {
      // ignore
    }
    baseCleanup();
  };
}
