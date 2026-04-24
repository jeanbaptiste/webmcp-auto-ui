// @ts-nocheck
// ---------------------------------------------------------------------------
// MapLibre GL JS mapping server — 12 widgets
// Vector-tile basemaps, markers, GeoJSON, heatmap, choropleth, clusters,
// 3D buildings, terrain, raster, vector tiles, image overlays
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import mapRecipe from './recipes/map.md?raw';
import markersRecipe from './recipes/markers.md?raw';
import geojsonRecipe from './recipes/geojson.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import choroplethRecipe from './recipes/choropleth.md?raw';
import lineRecipe from './recipes/line.md?raw';
import clusterRecipe from './recipes/cluster.md?raw';
import buildings3dRecipe from './recipes/buildings-3d.md?raw';
import terrainRecipe from './recipes/terrain.md?raw';
import rasterRecipe from './recipes/raster.md?raw';
import vectorTilesRecipe from './recipes/vector-tiles.md?raw';
import imageOverlayRecipe from './recipes/image-overlay.md?raw';

// Renderers
import { render as renderMap } from './widgets/map.js';
import { render as renderMarkers } from './widgets/markers.js';
import { render as renderGeojson } from './widgets/geojson.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderChoropleth } from './widgets/choropleth.js';
import { render as renderLine } from './widgets/line.js';
import { render as renderCluster } from './widgets/cluster.js';
import { render as renderBuildings3d } from './widgets/buildings-3d.js';
import { render as renderTerrain } from './widgets/terrain.js';
import { render as renderRaster } from './widgets/raster.js';
import { render as renderVectorTiles } from './widgets/vector-tiles.js';
import { render as renderImageOverlay } from './widgets/image-overlay.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const maplibreServer = createWebMcpServer('maplibre', {
  description:
    'MapLibre GL JS — vector-tile maps, markers, GeoJSON, heatmap, choropleth, clusters, 3D buildings, terrain, raster, vector tiles, image overlays (12 widgets)',
});

const widgets: Array<[string, unknown]> = [
  [mapRecipe, renderMap],
  [markersRecipe, renderMarkers],
  [geojsonRecipe, renderGeojson],
  [heatmapRecipe, renderHeatmap],
  [choroplethRecipe, renderChoropleth],
  [lineRecipe, renderLine],
  [clusterRecipe, renderCluster],
  [buildings3dRecipe, renderBuildings3d],
  [terrainRecipe, renderTerrain],
  [rasterRecipe, renderRaster],
  [vectorTilesRecipe, renderVectorTiles],
  [imageOverlayRecipe, renderImageOverlay],
];

for (const [recipe, renderer] of widgets) {
  maplibreServer.registerWidget(recipe as string, renderer);
}

export { maplibreServer };
