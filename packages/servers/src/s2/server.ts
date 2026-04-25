// @ts-nocheck
// ---------------------------------------------------------------------------
// S2 (Google spherical geometry) server — 11 widgets rendered on MapLibre.
// Cells are converted to GeoJSON polygons (4 vertices per cell) and drawn
// as fill+line layers.
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import cellRecipe from './recipes/cell.md?raw';
import gridRecipe from './recipes/grid.md?raw';
import fromPointsRecipe from './recipes/from-points.md?raw';
import neighborsRecipe from './recipes/neighbors.md?raw';
import coverRecipe from './recipes/cover.md?raw';
import childrenRecipe from './recipes/children.md?raw';
import parentRecipe from './recipes/parent.md?raw';
import bboxCoverRecipe from './recipes/bbox-cover.md?raw';
import levelCompareRecipe from './recipes/level-compare.md?raw';
import cellIdRecipe from './recipes/cell-id.md?raw';
import regionCovererRecipe from './recipes/region-coverer.md?raw';

// Renderers
import { render as renderCell } from './widgets/cell.js';
import { render as renderGrid } from './widgets/grid.js';
import { render as renderFromPoints } from './widgets/from-points.js';
import { render as renderNeighbors } from './widgets/neighbors.js';
import { render as renderCover } from './widgets/cover.js';
import { render as renderChildren } from './widgets/children.js';
import { render as renderParent } from './widgets/parent.js';
import { render as renderBboxCover } from './widgets/bbox-cover.js';
import { render as renderLevelCompare } from './widgets/level-compare.js';
import { render as renderCellId } from './widgets/cell-id.js';
import { render as renderRegionCoverer } from './widgets/region-coverer.js';

const s2Server = createWebMcpServer('s2', {
  description:
    'Google S2 (spherical geometry) — index, cover, neighbors, children/parent, RegionCoverer, density. 11 visual widgets rendered on MapLibre.',
});

const widgets: Array<[string, unknown]> = [
  [cellRecipe, renderCell],
  [gridRecipe, renderGrid],
  [fromPointsRecipe, renderFromPoints],
  [neighborsRecipe, renderNeighbors],
  [coverRecipe, renderCover],
  [childrenRecipe, renderChildren],
  [parentRecipe, renderParent],
  [bboxCoverRecipe, renderBboxCover],
  [levelCompareRecipe, renderLevelCompare],
  [cellIdRecipe, renderCellId],
  [regionCovererRecipe, renderRegionCoverer],
];

for (const [recipe, renderer] of widgets) {
  s2Server.registerWidget(recipe as string, renderer);
}

export { s2Server };
