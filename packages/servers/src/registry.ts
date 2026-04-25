// Shared WebMCP server registry — single source of truth for server metadata
// (id, label, description, category). The actual server instances are imported
// here so consumers (showcase, viewer, future apps) avoid duplicating the list.
//
// `autoui` is intentionally NOT included — it lives in @webmcp-auto-ui/agent
// (built-in WebMCP server, no third-party deps). Consumers prepend it.
import type { WebMcpServer } from '@webmcp-auto-ui/core';
import {
  agChartsServer, canvas2dServer, cesiumServer, chartjsServer, cytoscapeServer,
  d3server, deckglServer, echartsServer, g6Server, h3Server,
  leafletServer, maplibreServer, mermaidServer, nivoServer, observablePlotServer,
  openLayersServer, perspectiveServer, pixijsServer, plotlyServer,
  protomapsServer, rechartsServer, roughServer, s2Server, sigmaServer,
  threejsServer, tremorServer, turfServer, vegaServer, vegaLiteServer,
} from './index.js';

export type WebMcpCategory = 'generic' | 'charts' | 'graph' | 'dashboard' | '2d3d' | 'geo';

export interface WebMcpRegistryEntry {
  id: string;
  label: string;
  description: string;
  category: WebMcpCategory;
  server: WebMcpServer;
}

export const WEBMCP_CATEGORY_ORDER: readonly WebMcpCategory[] = [
  'generic', 'charts', 'graph', 'dashboard', '2d3d', 'geo',
];

export const WEBMCP_CATEGORY_LABELS: Record<WebMcpCategory, string> = {
  generic: 'Générique',
  charts: 'Charts',
  graph: 'Graphes & réseaux',
  dashboard: 'Dashboards',
  '2d3d': '2D / 3D',
  geo: 'Géo & cartes',
};

export const WEBMCP_SERVER_REGISTRY: WebMcpRegistryEntry[] = [
  { id: 'canvas2d', label: 'Canvas 2D', description: 'Dessins et animations Canvas 2D', category: 'generic', server: canvas2dServer },
  { id: 'rough', label: 'Rough.js', description: 'Dessins style croquis (hand-drawn look)', category: 'generic', server: roughServer },
  { id: 'chartjs', label: 'Chart.js', description: 'Graphiques interactifs Chart.js (bar, line, pie, radar...)', category: 'charts', server: chartjsServer },
  { id: 'd3', label: 'D3.js', description: 'Visualisations D3.js avancees (treemap, force, chord...)', category: 'charts', server: d3server },
  { id: 'echarts', label: 'Apache ECharts', description: 'Charts Apache ECharts (bar, radar, sankey, funnel, gauge, calendar, graph, 22 widgets)', category: 'charts', server: echartsServer },
  { id: 'mermaid', label: 'Mermaid', description: 'Diagrammes Mermaid (flowchart, sequence, gantt...)', category: 'charts', server: mermaidServer },
  { id: 'nivo', label: 'Nivo', description: 'Charts Nivo React (bar, line, pie, heatmap, sankey, calendar, chord, 24 widgets)', category: 'charts', server: nivoServer },
  { id: 'observable-plot', label: 'Observable Plot', description: 'Observable Plot (dot, line, hexbin, contour, voronoi, delaunay, tree, 38 widgets)', category: 'charts', server: observablePlotServer },
  { id: 'plotly', label: 'Plotly', description: 'Graphiques scientifiques Plotly (scatter, 3D, contour...)', category: 'charts', server: plotlyServer },
  { id: 'recharts', label: 'Recharts', description: 'Charts Recharts React (line, bar, area, composed, pie, sankey, funnel, 12 widgets)', category: 'charts', server: rechartsServer },
  { id: 'vega', label: 'Vega', description: 'Vega full — force, contour, wordcloud, chord, geo (17 widgets bas niveau)', category: 'charts', server: vegaServer },
  { id: 'vegalite', label: 'Vega-Lite', description: 'Vega-Lite — grammaire concise (26 widgets : marks, transforms, facets, SPLOM)', category: 'charts', server: vegaLiteServer },
  { id: 'cytoscape', label: 'Cytoscape', description: 'Graphes et reseaux (nodes, edges, layouts)', category: 'graph', server: cytoscapeServer },
  { id: 'g6', label: 'G6 (AntV)', description: 'Graphes AntV G6 v5 (force, dagre, mindmap, ego-network, chord, combo, 21 widgets)', category: 'graph', server: g6Server },
  { id: 'sigma', label: 'Sigma + Graphology', description: 'Graphes WebGL Sigma.js + générateurs Graphology (force, clusters, multi-modal, 14 widgets)', category: 'graph', server: sigmaServer },
  { id: 'agcharts', label: 'AG Charts', description: 'AG Charts community (bar, line, candlestick, sankey, gauges, radar, 29 widgets)', category: 'dashboard', server: agChartsServer },
  { id: 'perspective', label: 'Perspective', description: 'Pivot tables + charts FINOS Perspective (datagrid, pivot, candlestick, treemap, 17 widgets)', category: 'dashboard', server: perspectiveServer },
  { id: 'tremor', label: 'Tremor', description: 'Dashboards Tremor React (KPI cards, metrics, sparklines, progress, 20 widgets)', category: 'dashboard', server: tremorServer },
  { id: 'pixijs', label: 'PixiJS', description: 'Rendus PixiJS haute performance (sprites, particles)', category: '2d3d', server: pixijsServer },
  { id: 'threejs', label: 'Three.js', description: 'Scenes 3D Three.js (mesh, lights, animations)', category: '2d3d', server: threejsServer },
  { id: 'cesium', label: 'CesiumJS', description: 'Globe 3D Cesium (markers, polygons, 3D tiles, terrain, KML, particles, 20 widgets)', category: 'geo', server: cesiumServer },
  { id: 'deckgl', label: 'deck.gl', description: 'WebGL geo data viz sur MapLibre (scatterplot, hexagon, heatmap, H3, MVT, trips, terrain, 24 widgets)', category: 'geo', server: deckglServer },
  { id: 'h3', label: 'H3', description: 'Indexation hexagonale H3 (Uber) sur MapLibre (grid, polyfill, compact, edges, 14 widgets visuels)', category: 'geo', server: h3Server },
  { id: 'leaflet', label: 'Leaflet', description: 'Cartes interactives Leaflet (markers, GeoJSON, heatmap)', category: 'geo', server: leafletServer },
  { id: 'maplibre', label: 'MapLibre GL', description: 'Cartes vectorielles WebGL (markers, heatmap, 3D buildings, terrain, clusters, vector tiles)', category: 'geo', server: maplibreServer },
  { id: 'openlayers', label: 'OpenLayers', description: 'OpenLayers v10 (OSM, WMS, WMTS, MVT, KML, GPX, draw, modify, 29 widgets)', category: 'geo', server: openLayersServer },
  { id: 'protomaps', label: 'Protomaps', description: 'pmtiles vector basemaps (light/dark/grayscale, Overture, 3D buildings, hillshading, 14 widgets)', category: 'geo', server: protomapsServer },
  { id: 's2', label: 'S2', description: 'Cells S2 sphériques (Google) sur MapLibre (cell, cover, region-coverer, 11 widgets visuels)', category: 'geo', server: s2Server },
  { id: 'turf', label: 'Turf.js', description: 'Geospatial analysis Turf.js (buffer, union, intersect, clusters, grids, booleans, 37 widgets visuels)', category: 'geo', server: turfServer },
];
