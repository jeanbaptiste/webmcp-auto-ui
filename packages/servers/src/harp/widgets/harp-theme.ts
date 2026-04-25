// @ts-nocheck
// ---------------------------------------------------------------------------
// harp-theme — switch between published Harp themes (day/night/reduced)
// ---------------------------------------------------------------------------

import {
  appendTitle,
  createMapView,
  DEFAULT_THEME,
  REDUCED_DAY_THEME,
  REDUCED_NIGHT_THEME,
  renderEmpty,
  tryAddControls,
  tryAddOmvDataSource,
} from './shared.js';

const THEMES: Record<string, string> = {
  base: DEFAULT_THEME,
  day: REDUCED_DAY_THEME,
  night: REDUCED_NIGHT_THEME,
};

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d = data as any;
  appendTitle(container, d.title);

  const themeUrl =
    typeof d.theme === 'string' && d.theme.startsWith('http')
      ? d.theme
      : THEMES[d.theme ?? 'base'] ?? DEFAULT_THEME;

  const result = await createMapView(container, {
    theme: themeUrl,
    projection: d.projection === 'sphere' ? 'sphere' : 'mercator',
    center: d.center,
    zoom: d.zoom ?? 12,
    tilt: d.tilt ?? 0,
    heading: d.heading ?? 0,
  });

  if (!result) return renderEmpty(container, 'harp-theme');

  const { mapView, harp, cleanup } = result;
  tryAddControls(harp, mapView);
  tryAddOmvDataSource(harp, mapView, { apiKey: d.apiKey });

  return cleanup;
}
