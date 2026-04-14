// @ts-nocheck
// ---------------------------------------------------------------------------
// Leaflet mapping server — 26 widgets
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import tileLayerRecipe from './recipes/tile-layer.md?raw';
import tileWmsRecipe from './recipes/tile-wms.md?raw';
import tileProviderRecipe from './recipes/tile-provider.md?raw';
import vectorGridRecipe from './recipes/vector-grid.md?raw';
import markerRecipe from './recipes/marker.md?raw';
import markerClusterRecipe from './recipes/marker-cluster.md?raw';
import spiderMarkerRecipe from './recipes/spider-marker.md?raw';
import circleRecipe from './recipes/circle.md?raw';
import circleMarkerRecipe from './recipes/circle-marker.md?raw';
import polylineRecipe from './recipes/polyline.md?raw';
import polygonRecipe from './recipes/polygon.md?raw';
import rectangleRecipe from './recipes/rectangle.md?raw';
import geojsonRecipe from './recipes/geojson.md?raw';
import choroplethRecipe from './recipes/choropleth.md?raw';
import dataClassificationRecipe from './recipes/data-classification.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import webglHeatmapRecipe from './recipes/webgl-heatmap.md?raw';
import imageOverlayRecipe from './recipes/image-overlay.md?raw';
import videoOverlayRecipe from './recipes/video-overlay.md?raw';
import svgOverlayRecipe from './recipes/svg-overlay.md?raw';
import layerGroupRecipe from './recipes/layer-group.md?raw';
import featureGroupRecipe from './recipes/feature-group.md?raw';
import drawToolsRecipe from './recipes/draw-tools.md?raw';
import routingRecipe from './recipes/routing.md?raw';
import d3OverlayRecipe from './recipes/d3-overlay.md?raw';
import webglPointsRecipe from './recipes/webgl-points.md?raw';

// Renderers
import { render as renderTileLayer } from './widgets/tile-layer.js';
import { render as renderTileWms } from './widgets/tile-wms.js';
import { render as renderTileProvider } from './widgets/tile-provider.js';
import { render as renderVectorGrid } from './widgets/vector-grid.js';
import { render as renderMarker } from './widgets/marker.js';
import { render as renderMarkerCluster } from './widgets/marker-cluster.js';
import { render as renderSpiderMarker } from './widgets/spider-marker.js';
import { render as renderCircle } from './widgets/circle.js';
import { render as renderCircleMarker } from './widgets/circle-marker.js';
import { render as renderPolyline } from './widgets/polyline.js';
import { render as renderPolygon } from './widgets/polygon.js';
import { render as renderRectangle } from './widgets/rectangle.js';
import { render as renderGeojson } from './widgets/geojson.js';
import { render as renderChoropleth } from './widgets/choropleth.js';
import { render as renderDataClassification } from './widgets/data-classification.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderWebglHeatmap } from './widgets/webgl-heatmap.js';
import { render as renderImageOverlay } from './widgets/image-overlay.js';
import { render as renderVideoOverlay } from './widgets/video-overlay.js';
import { render as renderSvgOverlay } from './widgets/svg-overlay.js';
import { render as renderLayerGroup } from './widgets/layer-group.js';
import { render as renderFeatureGroup } from './widgets/feature-group.js';
import { render as renderDrawTools } from './widgets/draw-tools.js';
import { render as renderRouting } from './widgets/routing.js';
import { render as renderD3Overlay } from './widgets/d3-overlay.js';
import { render as renderWebglPoints } from './widgets/webgl-points.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const leafletServer = createWebMcpServer('leaflet', {
  description:
    'Interactive Leaflet maps (tiles, markers, clusters, GeoJSON, choropleth, heatmap, routing, drawing tools, WebGL overlays, and more)',
});

const widgets: Array<[string, unknown]> = [
  [tileLayerRecipe, renderTileLayer],
  [tileWmsRecipe, renderTileWms],
  [tileProviderRecipe, renderTileProvider],
  [vectorGridRecipe, renderVectorGrid],
  [markerRecipe, renderMarker],
  [markerClusterRecipe, renderMarkerCluster],
  [spiderMarkerRecipe, renderSpiderMarker],
  [circleRecipe, renderCircle],
  [circleMarkerRecipe, renderCircleMarker],
  [polylineRecipe, renderPolyline],
  [polygonRecipe, renderPolygon],
  [rectangleRecipe, renderRectangle],
  [geojsonRecipe, renderGeojson],
  [choroplethRecipe, renderChoropleth],
  [dataClassificationRecipe, renderDataClassification],
  [heatmapRecipe, renderHeatmap],
  [webglHeatmapRecipe, renderWebglHeatmap],
  [imageOverlayRecipe, renderImageOverlay],
  [videoOverlayRecipe, renderVideoOverlay],
  [svgOverlayRecipe, renderSvgOverlay],
  [layerGroupRecipe, renderLayerGroup],
  [featureGroupRecipe, renderFeatureGroup],
  [drawToolsRecipe, renderDrawTools],
  [routingRecipe, renderRouting],
  [d3OverlayRecipe, renderD3Overlay],
  [webglPointsRecipe, renderWebglPoints],
];

for (const [recipe, renderer] of widgets) {
  leafletServer.registerWidget(recipe as string, renderer);
}

export { leafletServer };
