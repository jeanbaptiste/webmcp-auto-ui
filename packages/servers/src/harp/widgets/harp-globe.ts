// @ts-nocheck
// ---------------------------------------------------------------------------
// harp-globe — sphere projection (globe view)
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
  appendTitle(container, d.title);

  const result = await createMapView(container, {
    projection: 'sphere',
    center: d.center,
    zoom: d.zoom ?? 4,
    tilt: d.tilt ?? 0,
    heading: d.heading ?? 0,
  });

  if (!result) return renderEmpty(container, 'harp-globe', 'Sphere projection unavailable.');

  const { mapView, harp, cleanup } = result;
  tryAddControls(harp, mapView);
  tryAddOmvDataSource(harp, mapView, { apiKey: d.apiKey });

  return cleanup;
}
