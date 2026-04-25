// @ts-nocheck
// ---------------------------------------------------------------------------
// CesiumJS visualization server — 20 widgets (3D globe, geo data, time, scene)
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import globeRecipe from './recipes/globe.md?raw';
import markerRecipe from './recipes/marker.md?raw';
import pointsRecipe from './recipes/points.md?raw';
import lineRecipe from './recipes/line.md?raw';
import polygonRecipe from './recipes/polygon.md?raw';
import billboardRecipe from './recipes/billboard.md?raw';
import modelRecipe from './recipes/model.md?raw';
import czmlRecipe from './recipes/czml.md?raw';
import kmlRecipe from './recipes/kml.md?raw';
import geojsonRecipe from './recipes/geojson.md?raw';
import imageryRecipe from './recipes/imagery.md?raw';
import terrainRecipe from './recipes/terrain.md?raw';
import cameraFlyRecipe from './recipes/camera-fly.md?raw';
import clockRecipe from './recipes/clock.md?raw';
import tiles3dRecipe from './recipes/3d-tiles.md?raw';
import shadowsRecipe from './recipes/shadows.md?raw';
import atmosphereRecipe from './recipes/atmosphere.md?raw';
import skyboxRecipe from './recipes/skybox.md?raw';
import particlesRecipe from './recipes/particles.md?raw';
import heightmapRecipe from './recipes/heightmap.md?raw';

// Renderers
import { render as renderGlobe } from './widgets/globe.js';
import { render as renderMarker } from './widgets/marker.js';
import { render as renderPoints } from './widgets/points.js';
import { render as renderLine } from './widgets/line.js';
import { render as renderPolygon } from './widgets/polygon.js';
import { render as renderBillboard } from './widgets/billboard.js';
import { render as renderModel } from './widgets/model.js';
import { render as renderCzml } from './widgets/czml.js';
import { render as renderKml } from './widgets/kml.js';
import { render as renderGeoJson } from './widgets/geojson.js';
import { render as renderImagery } from './widgets/imagery.js';
import { render as renderTerrain } from './widgets/terrain.js';
import { render as renderCameraFly } from './widgets/camera-fly.js';
import { render as renderClock } from './widgets/clock.js';
import { render as renderTiles3d } from './widgets/3d-tiles.js';
import { render as renderShadows } from './widgets/shadows.js';
import { render as renderAtmosphere } from './widgets/atmosphere.js';
import { render as renderSkybox } from './widgets/skybox.js';
import { render as renderParticles } from './widgets/particles.js';
import { render as renderHeightmap } from './widgets/heightmap.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const cesiumServer = createWebMcpServer('cesium', {
  description:
    '3D globe visualizations with CesiumJS (markers, polylines, polygons, glTF models, CZML/KML/GeoJSON, 3D Tiles, shadows, atmosphere, particles, time animation)',
});

const widgets: Array<[string, unknown]> = [
  [globeRecipe, renderGlobe],
  [markerRecipe, renderMarker],
  [pointsRecipe, renderPoints],
  [lineRecipe, renderLine],
  [polygonRecipe, renderPolygon],
  [billboardRecipe, renderBillboard],
  [modelRecipe, renderModel],
  [czmlRecipe, renderCzml],
  [kmlRecipe, renderKml],
  [geojsonRecipe, renderGeoJson],
  [imageryRecipe, renderImagery],
  [terrainRecipe, renderTerrain],
  [cameraFlyRecipe, renderCameraFly],
  [clockRecipe, renderClock],
  [tiles3dRecipe, renderTiles3d],
  [shadowsRecipe, renderShadows],
  [atmosphereRecipe, renderAtmosphere],
  [skyboxRecipe, renderSkybox],
  [particlesRecipe, renderParticles],
  [heightmapRecipe, renderHeightmap],
];

for (const [recipe, renderer] of widgets) {
  cesiumServer.registerWidget(recipe as string, renderer);
}

export { cesiumServer };
