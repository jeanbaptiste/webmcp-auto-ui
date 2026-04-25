// @ts-nocheck
// ---------------------------------------------------------------------------
// deck.gl WebGL geo data-viz server — 22 widgets
// MapLibre basemap + deck.gl overlay (MapboxOverlay), covering the four
// major deck.gl layer families: layers, aggregation-layers, geo-layers,
// mesh-layers.
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import scatterplotRecipe from './recipes/scatterplot.md?raw';
import lineRecipe from './recipes/line.md?raw';
import arcRecipe from './recipes/arc.md?raw';
import pathRecipe from './recipes/path.md?raw';
import polygonRecipe from './recipes/polygon.md?raw';
import geojsonRecipe from './recipes/geojson.md?raw';
import iconRecipe from './recipes/icon.md?raw';
import textRecipe from './recipes/text.md?raw';
import bitmapRecipe from './recipes/bitmap.md?raw';
import hexagonRecipe from './recipes/hexagon.md?raw';
import gridRecipe from './recipes/grid.md?raw';
import screenGridRecipe from './recipes/screen-grid.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import contourRecipe from './recipes/contour.md?raw';
import cpuGridRecipe from './recipes/cpu-grid.md?raw';
import h3HexagonRecipe from './recipes/h3-hexagon.md?raw';
import h3ClusterRecipe from './recipes/h3-cluster.md?raw';
import s2Recipe from './recipes/s2.md?raw';
import tileRecipe from './recipes/tile.md?raw';
import mvtRecipe from './recipes/mvt.md?raw';
import tripsRecipe from './recipes/trips.md?raw';
import terrainRecipe from './recipes/terrain.md?raw';
import simpleMeshRecipe from './recipes/simple-mesh.md?raw';
import scenegraphRecipe from './recipes/scenegraph.md?raw';

// Renderers
import { render as renderScatterplot } from './widgets/scatterplot.js';
import { render as renderLine } from './widgets/line.js';
import { render as renderArc } from './widgets/arc.js';
import { render as renderPath } from './widgets/path.js';
import { render as renderPolygon } from './widgets/polygon.js';
import { render as renderGeojson } from './widgets/geojson.js';
import { render as renderIcon } from './widgets/icon.js';
import { render as renderText } from './widgets/text.js';
import { render as renderBitmap } from './widgets/bitmap.js';
import { render as renderHexagon } from './widgets/hexagon.js';
import { render as renderGrid } from './widgets/grid.js';
import { render as renderScreenGrid } from './widgets/screen-grid.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderContour } from './widgets/contour.js';
import { render as renderCpuGrid } from './widgets/cpu-grid.js';
import { render as renderH3Hexagon } from './widgets/h3-hexagon.js';
import { render as renderH3Cluster } from './widgets/h3-cluster.js';
import { render as renderS2 } from './widgets/s2.js';
import { render as renderTile } from './widgets/tile.js';
import { render as renderMvt } from './widgets/mvt.js';
import { render as renderTrips } from './widgets/trips.js';
import { render as renderTerrain } from './widgets/terrain.js';
import { render as renderSimpleMesh } from './widgets/simple-mesh.js';
import { render as renderScenegraph } from './widgets/scenegraph.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const deckglServer = createWebMcpServer('deckgl', {
  description:
    'WebGL geographic data viz with deck.gl + MapLibre — points, arcs, paths, polygons, hex/grid/heatmap aggregation, H3/S2, vector & raster tiles, animated trips, terrain, 3D meshes & glTF (24 widgets).',
});

const widgets: Array<[string, unknown]> = [
  [scatterplotRecipe, renderScatterplot],
  [lineRecipe, renderLine],
  [arcRecipe, renderArc],
  [pathRecipe, renderPath],
  [polygonRecipe, renderPolygon],
  [geojsonRecipe, renderGeojson],
  [iconRecipe, renderIcon],
  [textRecipe, renderText],
  [bitmapRecipe, renderBitmap],
  [hexagonRecipe, renderHexagon],
  [gridRecipe, renderGrid],
  [screenGridRecipe, renderScreenGrid],
  [heatmapRecipe, renderHeatmap],
  [contourRecipe, renderContour],
  [cpuGridRecipe, renderCpuGrid],
  [h3HexagonRecipe, renderH3Hexagon],
  [h3ClusterRecipe, renderH3Cluster],
  [s2Recipe, renderS2],
  [tileRecipe, renderTile],
  [mvtRecipe, renderMvt],
  [tripsRecipe, renderTrips],
  [terrainRecipe, renderTerrain],
  [simpleMeshRecipe, renderSimpleMesh],
  [scenegraphRecipe, renderScenegraph],
];

for (const [recipe, renderer] of widgets) {
  deckglServer.registerWidget(recipe as string, renderer);
}

export { deckglServer };
