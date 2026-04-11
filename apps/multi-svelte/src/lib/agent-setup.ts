import type { WebMcpServer } from '@webmcp-auto-ui/core';
import type { ToolLayer } from '@webmcp-auto-ui/agent';
import { autoui } from '@webmcp-auto-ui/agent';
import { autouivanilla } from '@webmcp-auto-ui/widgets-vanilla';
import { d3server } from '@webmcp-auto-ui/widgets-d3';
import { createCanvas2dServer } from '@webmcp-auto-ui/widgets-canvas2d';
import { mermaidServer } from '@webmcp-auto-ui/widgets-mermaid';
import { plotlyServer } from '@webmcp-auto-ui/widgets-plotly';
import { leafletServer } from '@webmcp-auto-ui/widgets-leaflet';

export interface ServerPack {
  id: string;
  label: string;
  description: string;
  server: WebMcpServer;
}

const canvas2dServer = createCanvas2dServer();

/** All available server packs */
export const ALL_PACKS: ServerPack[] = [
  { id: 'autoui',   label: 'Svelte Native',  description: 'Built-in Svelte widgets (stat, chart, table, etc.)', server: autoui },
  { id: 'vanilla',  label: 'Vanilla',         description: 'Vanilla JS renderers (lightweight, no framework)',   server: autouivanilla },
  { id: 'd3',       label: 'D3',              description: 'Sunburst, chord, contour, voronoi, force graph',     server: d3server },
  { id: 'canvas2d', label: 'Canvas 2D',       description: 'Heatmap, sparklines, scatter, density, flame graph', server: canvas2dServer },
  { id: 'mermaid',  label: 'Mermaid',         description: 'Flowcharts, sequence, gantt, ER, mindmap',           server: mermaidServer },
  { id: 'plotly',   label: 'Plotly',          description: 'Scatter, surface, histogram, box, violin, parallel', server: plotlyServer },
  { id: 'leaflet',  label: 'Leaflet',         description: 'Maps, choropleth, heatmap-geo, marker clusters',    server: leafletServer },
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
