// @ts-nocheck
import {
  createPmtilesMap,
  pmtilesUrl,
  renderEmpty,
} from './shared.js';

/**
 * Render a raster pmtiles archive (typically hillshade or DEM imagery) as a
 * full-bleed `raster` source. Caller must supply a raster pmtiles URL — the
 * default vector basemap won't work here.
 */
export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const {
    url,
    center = [0, 20],
    zoom = 2,
    tileSize = 512,
    opacity = 1,
  } = data as any;

  if (!url) {
    return renderEmpty(
      container,
      'protomaps-hillshading',
      'Pass <code>url</code> pointing to a raster <code>.pmtiles</code> archive (e.g. hillshade or DEM imagery).',
    );
  }

  const style = {
    version: 8,
    sources: {
      hillshade: {
        type: 'raster',
        url: pmtilesUrl(url),
        tileSize,
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#f0eee8' } },
      {
        id: 'hillshade-raster',
        type: 'raster',
        source: 'hillshade',
        paint: { 'raster-opacity': opacity },
      },
    ],
  };

  const { cleanup } = await createPmtilesMap(container, { style, center, zoom });
  return cleanup;
}
