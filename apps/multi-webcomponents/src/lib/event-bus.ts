// ---------------------------------------------------------------------------
// Simple typed event bus for communication between Custom Elements
// ---------------------------------------------------------------------------

type Listener = (...args: any[]) => void;

class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, fn: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach(fn => fn(...args));
  }

  off(event: string, fn: Listener): void {
    this.listeners.get(event)?.delete(fn);
  }
}

export const bus = new EventBus();

// Event names used across the app
export const Events = {
  /** MCP server connected: { url, name, toolCount } */
  MCP_CONNECTED: 'mcp:connected',
  /** MCP server disconnected: { url } */
  MCP_DISCONNECTED: 'mcp:disconnected',
  /** User sent a chat message: { text } */
  CHAT_SEND: 'chat:send',
  /** Agent produced text: { text } */
  AGENT_TEXT: 'agent:text',
  /** Agent is generating */
  AGENT_START: 'agent:start',
  /** Agent finished */
  AGENT_DONE: 'agent:done',
  /** Widget added: { id, type, data } */
  WIDGET_ADD: 'widget:add',
  /** All widgets cleared */
  WIDGET_CLEAR: 'widget:clear',
  /** Widget data update: { id, data } */
  WIDGET_UPDATE: 'widget:update',
  /** Tool call event: { name, guided } */
  TOOL_CALL: 'tool:call',
  /** Servers list changed */
  SERVERS_CHANGED: 'servers:changed',
} as const;
