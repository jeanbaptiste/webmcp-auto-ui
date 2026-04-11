/**
 * Simple EventEmitter-based state management for the multi-astro app.
 * No framework dependency — works with vanilla JS in Astro islands.
 */

type Listener<T> = (value: T) => void;

export class Store<T> {
  private _value: T;
  private _listeners = new Set<Listener<T>>();

  constructor(initial: T) {
    this._value = initial;
  }

  get value(): T {
    return this._value;
  }

  set(value: T) {
    this._value = value;
    for (const fn of this._listeners) fn(value);
  }

  update(fn: (current: T) => T) {
    this.set(fn(this._value));
  }

  subscribe(fn: Listener<T>): () => void {
    this._listeners.add(fn);
    fn(this._value); // emit current value immediately
    return () => this._listeners.delete(fn);
  }
}

// ── Chat messages ───────────────────────────────────────────────────────
export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: number;
}

export const messages = new Store<ChatMsg[]>([]);

// ── Active servers (by key) ─────────────────────────────────────────────
export interface ServerEntry {
  key: string;
  label: string;
  enabled: boolean;
}

export const servers = new Store<ServerEntry[]>([
  { key: 'vanilla', label: 'Vanilla (26 widgets)', enabled: true },
  { key: 'd3', label: 'D3 (8 widgets)', enabled: true },
  { key: 'canvas2d', label: 'Canvas 2D (5 widgets)', enabled: true },
  { key: 'mermaid', label: 'Mermaid (7 widgets)', enabled: true },
  { key: 'plotly', label: 'Plotly (6 widgets)', enabled: true },
]);

// ── Widgets on the canvas ───────────────────────────────────────────────
export interface WidgetItem {
  id: string;
  type: string;
  data: Record<string, unknown>;
  serverName?: string;
}

export const widgets = new Store<WidgetItem[]>([]);

// ── MCP connection state ────────────────────────────────────────────────
export const mcpUrl = new Store<string>('');
export const mcpConnected = new Store<boolean>(false);
export const mcpName = new Store<string>('');

// ── Agent state ─────────────────────────────────────────────────────────
export const generating = new Store<boolean>(false);
export const agentProgress = new Store<{ elapsed: number; toolCalls: number; lastTool: string }>({
  elapsed: 0,
  toolCalls: 0,
  lastTool: '',
});

// ── Helpers ─────────────────────────────────────────────────────────────
let _counter = 0;
export function uid(): string {
  return 'm' + (++_counter).toString(36) + Date.now().toString(36).slice(-4);
}

export function addMessage(role: ChatMsg['role'], content: string) {
  messages.update(list => [...list, { id: uid(), role, content, ts: Date.now() }]);
}

export function addWidget(type: string, data: Record<string, unknown>, serverName?: string): string {
  const id = uid();
  widgets.update(list => [...list, { id, type, data, serverName }]);
  return id;
}

export function clearWidgets() {
  widgets.set([]);
}
