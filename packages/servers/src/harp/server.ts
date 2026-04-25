// @ts-nocheck
// ---------------------------------------------------------------------------
// Harp.gl visualization server — 8 widgets
// Note: Harp.gl is ARCHIVED by HERE (2023). All widgets are best-effort and
// emit a visible empty-state card if the library fails to initialize.
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import harpMapRecipe from './recipes/harp-map.md?raw';
import harpGlobeRecipe from './recipes/harp-globe.md?raw';
import harpMercatorRecipe from './recipes/harp-mercator.md?raw';
import harpDataSourceRecipe from './recipes/harp-data-source.md?raw';
import harpMarkerRecipe from './recipes/harp-marker.md?raw';
import harpGeojsonRecipe from './recipes/harp-geojson.md?raw';
import harpPitchRecipe from './recipes/harp-pitch.md?raw';
import harpThemeRecipe from './recipes/harp-theme.md?raw';

// Renderers
import { render as renderMap } from './widgets/harp-map.js';
import { render as renderGlobe } from './widgets/harp-globe.js';
import { render as renderMercator } from './widgets/harp-mercator.js';
import { render as renderDataSource } from './widgets/harp-data-source.js';
import { render as renderMarker } from './widgets/harp-marker.js';
import { render as renderGeojson } from './widgets/harp-geojson.js';
import { render as renderPitch } from './widgets/harp-pitch.js';
import { render as renderTheme } from './widgets/harp-theme.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const harpServer = createWebMcpServer('harp', {
  description:
    '3D vector tile maps with Harp.gl (HERE, archived). Mercator and sphere projections, custom OMV/MVT data sources, GeoJSON overlays, themes, and tilted 3D building views.',
});

const widgets: Array<[string, unknown]> = [
  [harpMapRecipe, renderMap],
  [harpGlobeRecipe, renderGlobe],
  [harpMercatorRecipe, renderMercator],
  [harpDataSourceRecipe, renderDataSource],
  [harpMarkerRecipe, renderMarker],
  [harpGeojsonRecipe, renderGeojson],
  [harpPitchRecipe, renderPitch],
  [harpThemeRecipe, renderTheme],
];

for (const [recipe, renderer] of widgets) {
  harpServer.registerWidget(recipe as string, renderer);
}

export { harpServer };
