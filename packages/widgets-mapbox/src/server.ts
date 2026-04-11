// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-mapbox — WebMCP Server
// High-performance vector maps powered by Mapbox GL JS
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

import mapRecipe from './recipes/mapbox-map.md?raw';
import choroplethRecipe from './recipes/mapbox-choropleth.md?raw';
import map3dRecipe from './recipes/mapbox-3d.md?raw';
import routeRecipe from './recipes/mapbox-route.md?raw';

import { render as renderMap } from './widgets/mapbox-map.js';
import { render as renderChoropleth } from './widgets/mapbox-choropleth.js';
import { render as render3d } from './widgets/mapbox-3d.js';
import { render as renderRoute } from './widgets/mapbox-route.js';

export const mapboxServer = createWebMcpServer('mapbox', {
  description:
    'Vector map visualizations with Mapbox GL JS (map with markers, choropleth, 3D buildings/terrain, route tracing)',
});

mapboxServer.registerWidget(mapRecipe, renderMap);
mapboxServer.registerWidget(choroplethRecipe, renderChoropleth);
mapboxServer.registerWidget(map3dRecipe, render3d);
mapboxServer.registerWidget(routeRecipe, renderRoute);
