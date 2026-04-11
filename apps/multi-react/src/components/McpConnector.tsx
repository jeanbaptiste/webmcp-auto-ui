interface McpConnectorProps {
  url: string;
  onUrlChange: (url: string) => void;
  connected: boolean;
  connecting: boolean;
  serverName: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function McpConnector({
  url,
  onUrlChange,
  connected,
  connecting,
  serverName,
  onConnect,
  onDisconnect,
}: McpConnectorProps) {
  if (connected) {
    return (
      <div className="mcp-connected">
        <span className="mcp-dot mcp-dot--on" />
        <span className="mcp-name">{serverName}</span>
        <button className="btn btn-ghost btn-sm" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="mcp-connector">
      <input
        type="text"
        className="mcp-input"
        placeholder="https://mcp-server.example/sse"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onConnect();
        }}
        disabled={connecting}
      />
      <button
        className="btn btn-accent btn-sm"
        onClick={onConnect}
        disabled={connecting || !url.trim()}
      >
        {connecting ? '...' : 'Connect'}
      </button>
    </div>
  );
}
