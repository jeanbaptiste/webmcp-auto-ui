import { useRef, useEffect } from 'react';
import { mountWidget } from '@webmcp-auto-ui/core';
import type { WebMcpServer } from '@webmcp-auto-ui/core';
import { autoui } from '@webmcp-auto-ui/agent';
import type { WidgetItem } from '../hooks/useAgent';

interface WidgetCellProps {
  type: string;
  data: Record<string, unknown>;
  servers: WebMcpServer[];
}

function WidgetCell({ type, data, servers }: WidgetCellProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const allServers = [...servers, autoui as unknown as WebMcpServer];
    const cleanup = mountWidget(ref.current, type, data, allServers);
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [type, data, servers]);

  return <div ref={ref} className="widget-cell" />;
}

interface WidgetGridProps {
  widgets: WidgetItem[];
  servers: WebMcpServer[];
}

export function WidgetGrid({ widgets, servers }: WidgetGridProps) {
  if (widgets.length === 0) {
    return (
      <div className="widget-grid-empty">
        <p className="empty-text">
          Widgets will appear here when the agent renders them.
        </p>
      </div>
    );
  }

  return (
    <div className="widget-grid">
      {widgets.map((w) => (
        <WidgetCell key={w.id} type={w.type} data={w.data} servers={servers} />
      ))}
    </div>
  );
}
