// @ts-nocheck
// ---------------------------------------------------------------------------
// harp-geojson — GeoJSON layer via FeaturesDataSource (best-effort)
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
    zoom: d.zoom ?? 6,
    tilt: d.tilt ?? 0,
  });

  if (!result) return renderEmpty(container, 'harp-geojson');

  const { mapView, harp, cleanup } = result;
  tryAddControls(harp, mapView);
  tryAddOmvDataSource(harp, mapView, { apiKey: d.apiKey });

  // Try optional FeaturesDataSource — it lives in harp-features-datasource
  // which is NOT in the deps list; attempt dynamic import and fall through.
  if (d.geojson) {
    try {
      const mod = await import(/* @vite-ignore */ '@here/harp-features-datasource');
      const FeaturesDataSource = mod.FeaturesDataSource;
      if (FeaturesDataSource) {
        const fds = new FeaturesDataSource({
          name: 'user-geojson',
          styleSetName: 'geojson',
          geojson: d.geojson,
        });
        mapView.addDataSource(fds);
      }
    } catch (e) {
      console.warn(
        '[harp-geojson] @here/harp-features-datasource not available — GeoJSON not rendered:',
        e,
      );
      const note = document.createElement('div');
      note.textContent =
        'GeoJSON layer skipped: @here/harp-features-datasource not installed.';
      note.style.cssText =
        'position:absolute;bottom:6px;left:6px;background:rgba(255,243,205,0.95);color:#664d00;padding:6px 8px;border-radius:4px;font:12px system-ui;z-index:2;';
      container.appendChild(note);
    }
  }

  return cleanup;
}
