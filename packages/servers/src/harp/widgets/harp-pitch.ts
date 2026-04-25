// @ts-nocheck
// ---------------------------------------------------------------------------
// harp-pitch — tilted camera for 3D buildings / extrusions
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
    projection: 'mercator',
    center: d.center ?? [13.405, 52.52],
    zoom: d.zoom ?? 17,
    tilt: d.tilt ?? 55,
    heading: d.heading ?? 30,
  });

  if (!result) return renderEmpty(container, 'harp-pitch');

  const { mapView, harp, cleanup } = result;
  tryAddControls(harp, mapView);
  tryAddOmvDataSource(harp, mapView, { apiKey: d.apiKey });

  return cleanup;
}
