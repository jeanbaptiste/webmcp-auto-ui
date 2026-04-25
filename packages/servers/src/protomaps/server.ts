// @ts-nocheck
// ---------------------------------------------------------------------------
// Protomaps server — single-file vector tiles (.pmtiles) over MapLibre
// 14 widgets : basemap, custom-style, light/dark/grayscale/white/black themes,
// overture, buildings-3d, roads-only, boundaries, water, hillshading,
// with-overlay
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import basemapRecipe from './recipes/basemap.md?raw';
import customStyleRecipe from './recipes/custom-style.md?raw';
import lightRecipe from './recipes/light.md?raw';
import darkRecipe from './recipes/dark.md?raw';
import grayscaleRecipe from './recipes/grayscale.md?raw';
import whiteRecipe from './recipes/white.md?raw';
import blackRecipe from './recipes/black.md?raw';
import overtureRecipe from './recipes/overture.md?raw';
import buildings3dRecipe from './recipes/buildings-3d.md?raw';
import roadsOnlyRecipe from './recipes/roads-only.md?raw';
import boundariesRecipe from './recipes/boundaries.md?raw';
import waterRecipe from './recipes/water.md?raw';
import hillshadingRecipe from './recipes/hillshading.md?raw';
import withOverlayRecipe from './recipes/with-overlay.md?raw';

// Renderers
import { render as renderBasemap } from './widgets/basemap.js';
import { render as renderCustomStyle } from './widgets/custom-style.js';
import { render as renderLight } from './widgets/light.js';
import { render as renderDark } from './widgets/dark.js';
import { render as renderGrayscale } from './widgets/grayscale.js';
import { render as renderWhite } from './widgets/white.js';
import { render as renderBlack } from './widgets/black.js';
import { render as renderOverture } from './widgets/overture.js';
import { render as renderBuildings3d } from './widgets/buildings-3d.js';
import { render as renderRoadsOnly } from './widgets/roads-only.js';
import { render as renderBoundaries } from './widgets/boundaries.js';
import { render as renderWater } from './widgets/water.js';
import { render as renderHillshading } from './widgets/hillshading.js';
import { render as renderWithOverlay } from './widgets/with-overlay.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const protomapsServer = createWebMcpServer('protomaps', {
  description:
    'Protomaps (.pmtiles) vector tiles via MapLibre — single-file, no tile server. 14 widgets: basemaps (light/dark/grayscale/white/black), custom-style, Overture Maps, 3D buildings, roads-only, boundaries, water, hillshading raster, GeoJSON overlay.',
});

const widgets: Array<[string, unknown]> = [
  [basemapRecipe, renderBasemap],
  [customStyleRecipe, renderCustomStyle],
  [lightRecipe, renderLight],
  [darkRecipe, renderDark],
  [grayscaleRecipe, renderGrayscale],
  [whiteRecipe, renderWhite],
  [blackRecipe, renderBlack],
  [overtureRecipe, renderOverture],
  [buildings3dRecipe, renderBuildings3d],
  [roadsOnlyRecipe, renderRoadsOnly],
  [boundariesRecipe, renderBoundaries],
  [waterRecipe, renderWater],
  [hillshadingRecipe, renderHillshading],
  [withOverlayRecipe, renderWithOverlay],
];

for (const [recipe, renderer] of widgets) {
  protomapsServer.registerWidget(recipe as string, renderer);
}

export { protomapsServer };
