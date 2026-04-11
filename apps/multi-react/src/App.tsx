import { useState, useCallback } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { WidgetGrid } from './components/WidgetGrid';
import { ServerSelector } from './components/ServerSelector';
import { McpConnector } from './components/McpConnector';
import { useAgent } from './hooks/useAgent';
import { useServers } from './hooks/useServers';
import type { WebMcpServer } from '@webmcp-auto-ui/core';
import type { RemoteModelId } from '@webmcp-auto-ui/agent';

const LLM_OPTIONS: { id: RemoteModelId; label: string }[] = [
  { id: 'haiku', label: 'Haiku' },
  { id: 'sonnet', label: 'Sonnet' },
  { id: 'opus', label: 'Opus' },
];

export default function App() {
  const [model, setModel] = useState<RemoteModelId>('haiku');
  const { enabledServers, toggleServer, serverOptions } = useServers();

  const activeServers: WebMcpServer[] = enabledServers;

  const {
    messages,
    widgets,
    sending,
    sendMessage,
    clearWidgets,
    mcpUrl,
    setMcpUrl,
    mcpConnected,
    mcpName,
    mcpConnecting,
    connectMcp,
    disconnectMcp,
  } = useAgent({ servers: activeServers, model });

  const handleSend = useCallback(
    (text: string) => sendMessage(text),
    [sendMessage],
  );

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <h1 className="sidebar-title">
          Auto-UI <span className="accent">multi-react</span>
        </h1>

        {/* LLM selector */}
        <section className="sidebar-section">
          <label className="section-label">LLM</label>
          <select
            className="select"
            value={model}
            onChange={(e) => setModel(e.target.value as RemoteModelId)}
          >
            {LLM_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </section>

        {/* Server packs */}
        <section className="sidebar-section">
          <label className="section-label">Widget Packs</label>
          <ServerSelector options={serverOptions} onToggle={toggleServer} />
        </section>

        {/* MCP connector */}
        <section className="sidebar-section">
          <label className="section-label">MCP Server</label>
          <McpConnector
            url={mcpUrl}
            onUrlChange={setMcpUrl}
            connected={mcpConnected}
            connecting={mcpConnecting}
            serverName={mcpName}
            onConnect={connectMcp}
            onDisconnect={disconnectMcp}
          />
        </section>

        {widgets.length > 0 && (
          <button className="btn btn-ghost" onClick={clearWidgets}>
            Clear widgets
          </button>
        )}
      </aside>

      {/* ── Main area ── */}
      <main className="main-area">
        <WidgetGrid widgets={widgets} servers={activeServers} />
        <ChatPanel
          messages={messages}
          sending={sending}
          onSend={handleSend}
        />
      </main>
    </div>
  );
}
