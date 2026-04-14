// @ts-nocheck
// ---------------------------------------------------------------------------
// Mapbox GL visualization server — 20 widgets
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import choroplethMapRecipe from './recipes/choropleth-map.md?raw';
import routeMapRecipe from './recipes/route-map.md?raw';
import labelMapRecipe from './recipes/label-map.md?raw';
import bubbleMapRecipe from './recipes/bubble-map.md?raw';
import heatMapRecipe from './recipes/heat-map.md?raw';
import extrusionMapRecipe from './recipes/extrusion-map.md?raw';
import building3dMapRecipe from './recipes/building-3d-map.md?raw';
import satelliteMapRecipe from './recipes/satellite-map.md?raw';
import windParticleMapRecipe from './recipes/wind-particle-map.md?raw';
import terrainMapRecipe from './recipes/terrain-map.md?raw';
import hillshadeMapRecipe from './recipes/hillshade-map.md?raw';
import globeMapRecipe from './recipes/globe-map.md?raw';
import fogMapRecipe from './recipes/fog-map.md?raw';
import skyMapRecipe from './recipes/sky-map.md?raw';
import model3dMapRecipe from './recipes/model-3d-map.md?raw';
import clusterMapRecipe from './recipes/cluster-map.md?raw';
import animatedLineMapRecipe from './recipes/animated-line-map.md?raw';
import floorPlanMapRecipe from './recipes/floor-plan-map.md?raw';
import isochroneMapRecipe from './recipes/isochrone-map.md?raw';
import backgroundPatternMapRecipe from './recipes/background-pattern-map.md?raw';

// Renderers
import { render as renderChoroplethMap } from './widgets/choropleth-map.js';
import { render as renderRouteMap } from './widgets/route-map.js';
import { render as renderLabelMap } from './widgets/label-map.js';
import { render as renderBubbleMap } from './widgets/bubble-map.js';
import { render as renderHeatMap } from './widgets/heat-map.js';
import { render as renderExtrusionMap } from './widgets/extrusion-map.js';
import { render as renderBuilding3dMap } from './widgets/building-3d-map.js';
import { render as renderSatelliteMap } from './widgets/satellite-map.js';
import { render as renderWindParticleMap } from './widgets/wind-particle-map.js';
import { render as renderTerrainMap } from './widgets/terrain-map.js';
import { render as renderHillshadeMap } from './widgets/hillshade-map.js';
import { render as renderGlobeMap } from './widgets/globe-map.js';
import { render as renderFogMap } from './widgets/fog-map.js';
import { render as renderSkyMap } from './widgets/sky-map.js';
import { render as renderModel3dMap } from './widgets/model-3d-map.js';
import { render as renderClusterMap } from './widgets/cluster-map.js';
import { render as renderAnimatedLineMap } from './widgets/animated-line-map.js';
import { render as renderFloorPlanMap } from './widgets/floor-plan-map.js';
import { render as renderIsochroneMap } from './widgets/isochrone-map.js';
import { render as renderBackgroundPatternMap } from './widgets/background-pattern-map.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const mapboxServer = createWebMcpServer('mapbox', {
  description:
    'Mapbox GL map visualizations (choropleth, route, heatmap, 3D buildings, terrain, globe, satellite, and more)',
});

const widgets: Array<[string, unknown]> = [
  [choroplethMapRecipe, renderChoroplethMap],
  [routeMapRecipe, renderRouteMap],
  [labelMapRecipe, renderLabelMap],
  [bubbleMapRecipe, renderBubbleMap],
  [heatMapRecipe, renderHeatMap],
  [extrusionMapRecipe, renderExtrusionMap],
  [building3dMapRecipe, renderBuilding3dMap],
  [satelliteMapRecipe, renderSatelliteMap],
  [windParticleMapRecipe, renderWindParticleMap],
  [terrainMapRecipe, renderTerrainMap],
  [hillshadeMapRecipe, renderHillshadeMap],
  [globeMapRecipe, renderGlobeMap],
  [fogMapRecipe, renderFogMap],
  [skyMapRecipe, renderSkyMap],
  [model3dMapRecipe, renderModel3dMap],
  [clusterMapRecipe, renderClusterMap],
  [animatedLineMapRecipe, renderAnimatedLineMap],
  [floorPlanMapRecipe, renderFloorPlanMap],
  [isochroneMapRecipe, renderIsochroneMap],
  [backgroundPatternMapRecipe, renderBackgroundPatternMap],
];

for (const [recipe, renderer] of widgets) {
  mapboxServer.registerWidget(recipe as string, renderer);
}

export { mapboxServer };
