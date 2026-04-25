// @ts-nocheck
// ---------------------------------------------------------------------------
// H3 (hexagonal hierarchical geospatial indexing) server — 14 widgets
// All widgets render visually on a MapLibre map by converting H3 cells to
// GeoJSON polygons via cellToBoundary().
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import gridRecipe from './recipes/grid.md?raw';
import fromPointsRecipe from './recipes/from-points.md?raw';
import diskRecipe from './recipes/disk.md?raw';
import ringRecipe from './recipes/ring.md?raw';
import pathRecipe from './recipes/path.md?raw';
import resolutionCompareRecipe from './recipes/resolution-compare.md?raw';
import childrenRecipe from './recipes/children.md?raw';
import parentRecipe from './recipes/parent.md?raw';
import polyfillRecipe from './recipes/polyfill.md?raw';
import bboxFillRecipe from './recipes/bbox-fill.md?raw';
import lineRecipe from './recipes/line.md?raw';
import edgesRecipe from './recipes/edges.md?raw';
import compactRecipe from './recipes/compact.md?raw';
import uncompactRecipe from './recipes/uncompact.md?raw';

// Renderers
import { render as renderGrid } from './widgets/grid.js';
import { render as renderFromPoints } from './widgets/from-points.js';
import { render as renderDisk } from './widgets/disk.js';
import { render as renderRing } from './widgets/ring.js';
import { render as renderPath } from './widgets/path.js';
import { render as renderResolutionCompare } from './widgets/resolution-compare.js';
import { render as renderChildren } from './widgets/children.js';
import { render as renderParent } from './widgets/parent.js';
import { render as renderPolyfill } from './widgets/polyfill.js';
import { render as renderBboxFill } from './widgets/bbox-fill.js';
import { render as renderLine } from './widgets/line.js';
import { render as renderEdges } from './widgets/edges.js';
import { render as renderCompact } from './widgets/compact.js';
import { render as renderUncompact } from './widgets/uncompact.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const h3Server = createWebMcpServer('h3', {
  description:
    "H3 hexagonal geospatial indexing — grid, density, disk, ring, path, resolution comparison, parent/child, polygon & bbox fill, line, edges, compact/uncompact (14 visual widgets rendered via MapLibre)",
});

const widgets: Array<[string, unknown]> = [
  [gridRecipe, renderGrid],
  [fromPointsRecipe, renderFromPoints],
  [diskRecipe, renderDisk],
  [ringRecipe, renderRing],
  [pathRecipe, renderPath],
  [resolutionCompareRecipe, renderResolutionCompare],
  [childrenRecipe, renderChildren],
  [parentRecipe, renderParent],
  [polyfillRecipe, renderPolyfill],
  [bboxFillRecipe, renderBboxFill],
  [lineRecipe, renderLine],
  [edgesRecipe, renderEdges],
  [compactRecipe, renderCompact],
  [uncompactRecipe, renderUncompact],
];

for (const [recipe, renderer] of widgets) {
  h3Server.registerWidget(recipe as string, renderer);
}

export { h3Server };
