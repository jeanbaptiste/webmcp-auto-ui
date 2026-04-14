import type { WebMcpServer } from '@webmcp-auto-ui/core';
import type { ToolLayer } from '@webmcp-auto-ui/agent';
import { autoui } from '@webmcp-auto-ui/agent';
import {
  d3server, threejsServer, mermaidServer, plotlyServer,
  leafletServer, mapboxServer, canvas2dServer, chartjsServer,
  cytoscapeServer, roughServer, pixijsServer,
} from '@webmcp-auto-ui/servers';

export interface ServerPack {
  id: string;
  label: string;
  description: string;
  server: WebMcpServer;
}

export const ALL_PACKS: ServerPack[] = [
  { id: 'autoui', label: 'AutoUI (Svelte)', description: 'Built-in Svelte widgets (stat, chart, table, etc.)', server: autoui },
  { id: 'd3', label: 'D3.js', description: 'Advanced data visualizations (treemap, sunburst, chord, force graph, etc.)', server: d3server },
  { id: 'threejs', label: 'Three.js', description: '3D visualizations (globe, terrain, scatter 3D, mesh viewer, etc.)', server: threejsServer },
  { id: 'mermaid', label: 'Mermaid', description: 'Diagrams (flowchart, sequence, gantt, ER, class, mindmap, etc.)', server: mermaidServer },
  { id: 'plotly', label: 'Plotly', description: 'Scientific charts (scatter, heatmap, 3D surface, sankey, etc.)', server: plotlyServer },
  { id: 'leaflet', label: 'Leaflet', description: 'Maps and geospatial (markers, choropleth, heatmap, routing, etc.)', server: leafletServer },
  { id: 'mapbox', label: 'Mapbox GL', description: '3D maps (buildings, terrain, globe, animated lines, etc.)', server: mapboxServer },
  { id: 'canvas2d', label: 'Canvas 2D', description: 'Lightweight charts with native Canvas API (bar, line, flame graph, etc.)', server: canvas2dServer },
  { id: 'chartjs', label: 'Chart.js', description: 'Simple charts (line, bar, pie, doughnut, radar, scatter, bubble)', server: chartjsServer },
  { id: 'cytoscape', label: 'Cytoscape', description: 'Graph and network visualizations (force, DAG, hierarchy, etc.)', server: cytoscapeServer },
  { id: 'rough', label: 'Rough.js', description: 'Hand-drawn style charts (sketch bar, pie, line, network, etc.)', server: roughServer },
  { id: 'pixijs', label: 'PixiJS', description: 'Animated WebGL visualizations (particles, waveform, gauge, etc.)', server: pixijsServer },
];

/** Build the agent tool layers from a set of enabled pack IDs */
export function buildLayers(enabledIds: Set<string>): ToolLayer[] {
  const layers: ToolLayer[] = [];
  for (const pack of ALL_PACKS) {
    if (enabledIds.has(pack.id)) {
      layers.push(pack.server.layer());
    }
  }
  return layers;
}

/** Get the WebMcpServer instances for WidgetRenderer */
export function getActiveServers(enabledIds: Set<string>): WebMcpServer[] {
  return ALL_PACKS
    .filter(p => enabledIds.has(p.id))
    .map(p => p.server);
}
