import { ref, computed } from 'vue';
import type { WebMcpServer } from '@webmcp-auto-ui/core';
import type { ToolLayer } from '@webmcp-auto-ui/agent';
import { autouivanilla } from '@webmcp-auto-ui/widgets-vanilla';
import { d3server } from '@webmcp-auto-ui/widgets-d3';
import { plotlyServer } from '@webmcp-auto-ui/widgets-plotly';
import { mermaidServer } from '@webmcp-auto-ui/widgets-mermaid';
import { autoui } from '@webmcp-auto-ui/agent';

export interface ServerOption {
  id: string;
  label: string;
  server: WebMcpServer;
  enabled: boolean;
}

const ALL_SERVERS: Omit<ServerOption, 'enabled'>[] = [
  { id: 'vanilla', label: 'Vanilla', server: autouivanilla },
  { id: 'd3', label: 'D3', server: d3server },
  { id: 'plotly', label: 'Plotly', server: plotlyServer },
  { id: 'mermaid', label: 'Mermaid', server: mermaidServer },
];

export function useServers() {
  const serverOptions = ref<ServerOption[]>(
    ALL_SERVERS.map(s => ({ ...s, enabled: true })),
  );

  const activeServers = computed<WebMcpServer[]>(() =>
    serverOptions.value.filter(s => s.enabled).map(s => s.server),
  );

  /** Tool layers for the agent loop: autoui native + all enabled WebMCP servers. */
  const layers = computed<ToolLayer[]>(() => {
    const result: ToolLayer[] = [];
    result.push(autoui.layer());
    for (const opt of serverOptions.value) {
      if (opt.enabled) result.push(opt.server.layer());
    }
    return result;
  });

  function toggle(id: string) {
    const opt = serverOptions.value.find(s => s.id === id);
    if (opt) opt.enabled = !opt.enabled;
  }

  function enableAll() {
    serverOptions.value.forEach(s => (s.enabled = true));
  }

  function disableAll() {
    serverOptions.value.forEach(s => (s.enabled = false));
  }

  return { serverOptions, activeServers, layers, toggle, enableAll, disableAll };
}
