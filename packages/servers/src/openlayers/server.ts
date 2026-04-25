// @ts-nocheck
// ---------------------------------------------------------------------------
// OpenLayers mapping server — 28 widgets
// (sources, vectors, formats, interactions, controls, geometries)
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import mapRecipe from './recipes/map.md?raw';
import osmRecipe from './recipes/osm.md?raw';
import xyzRecipe from './recipes/xyz.md?raw';
import vectorRecipe from './recipes/vector.md?raw';
import geojsonRecipe from './recipes/geojson.md?raw';
import kmlRecipe from './recipes/kml.md?raw';
import gpxRecipe from './recipes/gpx.md?raw';
import topojsonRecipe from './recipes/topojson.md?raw';
import clusterRecipe from './recipes/cluster.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import wmsRecipe from './recipes/wms.md?raw';
import wmtsRecipe from './recipes/wmts.md?raw';
import vectorTileRecipe from './recipes/vector-tile.md?raw';
import imageStaticRecipe from './recipes/image-static.md?raw';
import imageArcgisRecipe from './recipes/image-arcgis.md?raw';
import graticuleRecipe from './recipes/graticule.md?raw';
import popupRecipe from './recipes/popup.md?raw';
import selectRecipe from './recipes/select.md?raw';
import modifyRecipe from './recipes/modify.md?raw';
import drawRecipe from './recipes/draw.md?raw';
import projectionRecipe from './recipes/projection.md?raw';
import overviewRecipe from './recipes/overview.md?raw';
import scaleLineRecipe from './recipes/scale-line.md?raw';
import mousePositionRecipe from './recipes/mouse-position.md?raw';
import zoomSliderRecipe from './recipes/zoom-slider.md?raw';
import featureStyleRecipe from './recipes/feature-style.md?raw';
import circlesRecipe from './recipes/circles.md?raw';
import polygonsRecipe from './recipes/polygons.md?raw';
import linesRecipe from './recipes/lines.md?raw';

// Renderers
import { render as renderMap } from './widgets/map.js';
import { render as renderOsm } from './widgets/osm.js';
import { render as renderXyz } from './widgets/xyz.js';
import { render as renderVector } from './widgets/vector.js';
import { render as renderGeojson } from './widgets/geojson.js';
import { render as renderKml } from './widgets/kml.js';
import { render as renderGpx } from './widgets/gpx.js';
import { render as renderTopojson } from './widgets/topojson.js';
import { render as renderCluster } from './widgets/cluster.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderWms } from './widgets/wms.js';
import { render as renderWmts } from './widgets/wmts.js';
import { render as renderVectorTile } from './widgets/vector-tile.js';
import { render as renderImageStatic } from './widgets/image-static.js';
import { render as renderImageArcgis } from './widgets/image-arcgis.js';
import { render as renderGraticule } from './widgets/graticule.js';
import { render as renderPopup } from './widgets/popup.js';
import { render as renderSelect } from './widgets/select.js';
import { render as renderModify } from './widgets/modify.js';
import { render as renderDraw } from './widgets/draw.js';
import { render as renderProjection } from './widgets/projection.js';
import { render as renderOverview } from './widgets/overview.js';
import { render as renderScaleLine } from './widgets/scale-line.js';
import { render as renderMousePosition } from './widgets/mouse-position.js';
import { render as renderZoomSlider } from './widgets/zoom-slider.js';
import { render as renderFeatureStyle } from './widgets/feature-style.js';
import { render as renderCircles } from './widgets/circles.js';
import { render as renderPolygons } from './widgets/polygons.js';
import { render as renderLines } from './widgets/lines.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const openLayersServer = createWebMcpServer('openlayers', {
  description:
    'Interactive OpenLayers maps (OSM, XYZ, WMS/WMTS, vector tiles, GeoJSON/KML/GPX/TopoJSON, clustering, heatmaps, popups, selection, drawing, controls, custom projections, and more)',
});

const widgets: Array<[string, unknown]> = [
  [mapRecipe, renderMap],
  [osmRecipe, renderOsm],
  [xyzRecipe, renderXyz],
  [vectorRecipe, renderVector],
  [geojsonRecipe, renderGeojson],
  [kmlRecipe, renderKml],
  [gpxRecipe, renderGpx],
  [topojsonRecipe, renderTopojson],
  [clusterRecipe, renderCluster],
  [heatmapRecipe, renderHeatmap],
  [wmsRecipe, renderWms],
  [wmtsRecipe, renderWmts],
  [vectorTileRecipe, renderVectorTile],
  [imageStaticRecipe, renderImageStatic],
  [imageArcgisRecipe, renderImageArcgis],
  [graticuleRecipe, renderGraticule],
  [popupRecipe, renderPopup],
  [selectRecipe, renderSelect],
  [modifyRecipe, renderModify],
  [drawRecipe, renderDraw],
  [projectionRecipe, renderProjection],
  [overviewRecipe, renderOverview],
  [scaleLineRecipe, renderScaleLine],
  [mousePositionRecipe, renderMousePosition],
  [zoomSliderRecipe, renderZoomSlider],
  [featureStyleRecipe, renderFeatureStyle],
  [circlesRecipe, renderCircles],
  [polygonsRecipe, renderPolygons],
  [linesRecipe, renderLines],
];

for (const [recipe, renderer] of widgets) {
  openLayersServer.registerWidget(recipe as string, renderer);
}

export { openLayersServer };
