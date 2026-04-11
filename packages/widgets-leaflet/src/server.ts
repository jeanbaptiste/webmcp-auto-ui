// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-leaflet — WebMCP Server
// Cartographic widgets powered by Leaflet
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

import leafletMapRecipe from './recipes/leaflet-map.md?raw';
import choroplethRecipe from './recipes/choropleth.md?raw';
import heatmapGeoRecipe from './recipes/heatmap-geo.md?raw';
import markerClusterRecipe from './recipes/marker-cluster.md?raw';

import { render as renderLeafletMap } from './widgets/leaflet-map.js';
import { render as renderChoropleth } from './widgets/choropleth.js';
import { render as renderHeatmapGeo } from './widgets/heatmap-geo.js';
import { render as renderMarkerCluster } from './widgets/marker-cluster.js';

export const leafletServer = createWebMcpServer('leaflet', {
  description:
    'Cartographic widgets with Leaflet (interactive map, choropleth, geographic heatmap, marker clusters)',
});

leafletServer.registerWidget(leafletMapRecipe, renderLeafletMap);
leafletServer.registerWidget(choroplethRecipe, renderChoropleth);
leafletServer.registerWidget(heatmapGeoRecipe, renderHeatmapGeo);
leafletServer.registerWidget(markerClusterRecipe, renderMarkerCluster);
