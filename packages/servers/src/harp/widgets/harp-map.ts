// @ts-nocheck
// ---------------------------------------------------------------------------
// harp-map — basic 3D vector tile map (mercator) with default Berlin theme
// ---------------------------------------------------------------------------

import {
  appendTitle,
  createMapView,
  DEFAULT_THEME,
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
    theme: d.theme ?? DEFAULT_THEME,
    center: d.center,
    zoom: d.zoom,
    tilt: d.tilt,
    heading: d.heading,
    projection: 'mercator',
  });

  if (!result) return renderEmpty(container, 'harp-map');

  const { mapView, harp, cleanup } = result;
  tryAddControls(harp, mapView);
  tryAddOmvDataSource(harp, mapView, { apiKey: d.apiKey });

  return cleanup;
}
