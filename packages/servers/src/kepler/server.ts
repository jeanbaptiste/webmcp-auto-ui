// @ts-nocheck
// ---------------------------------------------------------------------------
// Kepler.gl visualization server — 13 widgets
//
// Kepler.gl is a full React/Redux geo-data exploration app. Each widget
// instantiates an isolated Redux store, dispatches a dataset + layer config,
// and mounts <KeplerGl /> via createRoot. A free MapLibre vector basemap
// (Carto Voyager) is wired via mapStyles so no Mapbox token is required.
//
// Widgets: points, arcs, heatmap, hexbin, grid, trip, icon, 3d-buildings,
// cluster, polygon, h3, line, csv-import.
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes (frontmatter + prose, bundled as raw text by Vite)
import pointsRecipe from './recipes/points.md?raw';
import arcsRecipe from './recipes/arcs.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import hexbinRecipe from './recipes/hexbin.md?raw';
import gridRecipe from './recipes/grid.md?raw';
import tripRecipe from './recipes/trip.md?raw';
import iconRecipe from './recipes/icon.md?raw';
import buildings3dRecipe from './recipes/3d-buildings.md?raw';
import clusterRecipe from './recipes/cluster.md?raw';
import polygonRecipe from './recipes/polygon.md?raw';
import h3Recipe from './recipes/h3.md?raw';
import lineRecipe from './recipes/line.md?raw';
import csvImportRecipe from './recipes/csv-import.md?raw';

// Renderers
import { render as renderPoints } from './widgets/points.js';
import { render as renderArcs } from './widgets/arcs.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderHexbin } from './widgets/hexbin.js';
import { render as renderGrid } from './widgets/grid.js';
import { render as renderTrip } from './widgets/trip.js';
import { render as renderIcon } from './widgets/icon.js';
import { render as renderBuildings3d } from './widgets/3d-buildings.js';
import { render as renderCluster } from './widgets/cluster.js';
import { render as renderPolygon } from './widgets/polygon.js';
import { render as renderH3 } from './widgets/h3.js';
import { render as renderLine } from './widgets/line.js';
import { render as renderCsvImport } from './widgets/csv-import.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const keplerServer = createWebMcpServer('kepler', {
  description:
    'Geospatial data exploration with Kepler.gl — points, arcs, heatmap, hexbin, grid, trip animations, icons, 3D buildings, clusters, polygons, H3, lines, CSV import (13 widgets, free MapLibre basemap, no Mapbox token required)',
});

const widgets: Array<[string, unknown]> = [
  [pointsRecipe, renderPoints],
  [arcsRecipe, renderArcs],
  [heatmapRecipe, renderHeatmap],
  [hexbinRecipe, renderHexbin],
  [gridRecipe, renderGrid],
  [tripRecipe, renderTrip],
  [iconRecipe, renderIcon],
  [buildings3dRecipe, renderBuildings3d],
  [clusterRecipe, renderCluster],
  [polygonRecipe, renderPolygon],
  [h3Recipe, renderH3],
  [lineRecipe, renderLine],
  [csvImportRecipe, renderCsvImport],
];

for (const [recipe, renderer] of widgets) {
  keplerServer.registerWidget(recipe as string, renderer);
}

export { keplerServer };
