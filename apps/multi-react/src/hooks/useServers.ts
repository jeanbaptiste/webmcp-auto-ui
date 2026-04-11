import { useState, useMemo, useCallback } from 'react';
import type { WebMcpServer } from '@webmcp-auto-ui/core';
import { autouivanilla } from '@webmcp-auto-ui/widgets-vanilla';
import { d3server } from '@webmcp-auto-ui/widgets-d3';
import { plotlyServer } from '@webmcp-auto-ui/widgets-plotly';
import { mermaidServer } from '@webmcp-auto-ui/widgets-mermaid';
import { muiServer } from '@webmcp-auto-ui/widgets-mui';

export interface ServerOption {
  id: string;
  label: string;
  widgetCount: number;
  enabled: boolean;
  server: WebMcpServer;
}

const ALL_SERVERS: { id: string; label: string; server: WebMcpServer }[] = [
  { id: 'vanilla', label: 'Vanilla', server: autouivanilla },
  { id: 'd3', label: 'D3', server: d3server },
  { id: 'plotly', label: 'Plotly', server: plotlyServer },
  { id: 'mermaid', label: 'Mermaid', server: mermaidServer },
  { id: 'mui', label: 'MUI (React)', server: muiServer },
];

export function useServers() {
  const [enabledIds, setEnabledIds] = useState<Set<string>>(
    () => new Set(['vanilla']),
  );

  const toggleServer = useCallback((id: string) => {
    setEnabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const serverOptions: ServerOption[] = useMemo(
    () =>
      ALL_SERVERS.map((s) => ({
        id: s.id,
        label: s.label,
        widgetCount: s.server.listWidgets().length,
        enabled: enabledIds.has(s.id),
        server: s.server,
      })),
    [enabledIds],
  );

  const enabledServers: WebMcpServer[] = useMemo(
    () =>
      ALL_SERVERS.filter((s) => enabledIds.has(s.id)).map((s) => s.server),
    [enabledIds],
  );

  return { enabledServers, toggleServer, serverOptions };
}
