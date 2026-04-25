import type { WebMcpServer } from '@webmcp-auto-ui/core';
import {
  agChartsServer, canvas2dServer, cesiumServer, chartjsServer, cytoscapeServer,
  d3server, deckglServer, echartsServer, g6Server, h3Server, harpServer,
  leafletServer, maplibreServer, mermaidServer, nivoServer, observablePlotServer,
  openLayersServer, perspectiveServer, pixijsServer, plotlyServer,
  protomapsServer, rechartsServer, roughServer, s2Server, sigmaServer,
  threejsServer, tremorServer, turfServer, vegaServer, vegaLiteServer,
} from '@webmcp-auto-ui/servers';
import { autoui } from '@webmcp-auto-ui/agent';

export interface ServerEntry {
  id: string;
  server: WebMcpServer;
}

export const SERVER_REGISTRY: ServerEntry[] = [
  { id: 'autoui',          server: autoui },
  { id: 'agcharts',        server: agChartsServer },
  { id: 'canvas2d',        server: canvas2dServer },
  { id: 'cesium',          server: cesiumServer },
  { id: 'chartjs',         server: chartjsServer },
  { id: 'cytoscape',       server: cytoscapeServer },
  { id: 'd3',              server: d3server },
  { id: 'deckgl',          server: deckglServer },
  { id: 'echarts',         server: echartsServer },
  { id: 'g6',              server: g6Server },
  { id: 'h3',              server: h3Server },
  { id: 'harp',            server: harpServer },
  { id: 'leaflet',         server: leafletServer },
  { id: 'maplibre',        server: maplibreServer },
  { id: 'mermaid',         server: mermaidServer },
  { id: 'nivo',            server: nivoServer },
  { id: 'observable-plot', server: observablePlotServer },
  { id: 'openlayers',      server: openLayersServer },
  { id: 'perspective',     server: perspectiveServer },
  { id: 'pixijs',          server: pixijsServer },
  { id: 'plotly',          server: plotlyServer },
  { id: 'protomaps',       server: protomapsServer },
  { id: 'recharts',        server: rechartsServer },
  { id: 'rough',           server: roughServer },
  { id: 's2',              server: s2Server },
  { id: 'sigma',           server: sigmaServer },
  { id: 'threejs',         server: threejsServer },
  { id: 'tremor',          server: tremorServer },
  { id: 'turf',            server: turfServer },
  { id: 'vega',            server: vegaServer },
  { id: 'vegalite',        server: vegaLiteServer },
];

export const DEFAULT_ENABLED = new Set<string>([
  'autoui', 'canvas2d', 'chartjs', 'cytoscape', 'd3',
  'leaflet', 'mermaid', 'pixijs', 'plotly', 'rough', 'threejs',
]);

const STORAGE_KEY = 'viewer.enabledServers';

export function loadEnabledServers(): Set<string> {
  if (typeof window === 'undefined') return new Set(DEFAULT_ENABLED);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set(DEFAULT_ENABLED);
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter(x => typeof x === 'string'));
  } catch { /* fall through */ }
  return new Set(DEFAULT_ENABLED);
}

export function saveEnabledServers(set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}
