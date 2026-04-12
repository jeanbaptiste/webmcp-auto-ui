import type { WebMcpServer } from '@webmcp-auto-ui/core';
import type { ToolLayer } from '@webmcp-auto-ui/agent';
import { autoui } from '@webmcp-auto-ui/agent';

export interface ServerPack {
  id: string;
  label: string;
  description: string;
  server: WebMcpServer;
}

/** All available server packs */
export const ALL_PACKS: ServerPack[] = [
  { id: 'autoui', label: 'Svelte Native', description: 'Built-in Svelte widgets (stat, chart, table, etc.)', server: autoui },
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
