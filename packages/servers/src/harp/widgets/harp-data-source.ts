// @ts-nocheck
// ---------------------------------------------------------------------------
// harp-data-source — OMV/MVT custom vector tile source
// ---------------------------------------------------------------------------

import {
  appendTitle,
  createMapView,
  renderEmpty,
  tryAddControls,
} from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d = data as any;
  appendTitle(container, d.title);

  const result = await createMapView(container, {
    projection: d.projection === 'sphere' ? 'sphere' : 'mercator',
    center: d.center,
    zoom: d.zoom ?? 12,
    tilt: d.tilt ?? 0,
    heading: d.heading ?? 0,
    theme: d.theme,
  });

  if (!result) return renderEmpty(container, 'harp-data-source');

  const { mapView, harp, cleanup } = result;
  tryAddControls(harp, mapView);

  // Custom OMV data source
  try {
    const ds = new harp.OmvDataSource({
      baseUrl: d.baseUrl ?? 'https://vector.hereapi.com/v2/vectortiles/base/mc',
      apiFormat: d.apiFormat ?? harp.APIFormat?.XYZOMV ?? 0,
      styleSetName: d.styleSetName ?? 'tilezen',
      authenticationCode: d.apiKey ?? '',
      authenticationMethod: d.apiKey
        ? { method: harp.AuthenticationMethod?.QueryString ?? 'QueryString', name: 'apikey' }
        : undefined,
    });
    mapView.addDataSource(ds);
  } catch (e) {
    console.warn('[harp-data-source] failed to add data source:', e);
  }

  return cleanup;
}
