// @ts-nocheck
// ---------------------------------------------------------------------------
// harp-mercator — flat mercator projection (explicit, no tilt)
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
    center: d.center,
    zoom: d.zoom ?? 10,
    tilt: 0,
    heading: 0,
  });

  if (!result) return renderEmpty(container, 'harp-mercator');

  const { mapView, harp, cleanup } = result;
  tryAddControls(harp, mapView);
  tryAddOmvDataSource(harp, mapView, { apiKey: d.apiKey });

  return cleanup;
}
