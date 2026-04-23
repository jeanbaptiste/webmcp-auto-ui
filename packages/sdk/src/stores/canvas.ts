/**
 * Canvas state store — Vanilla (framework-agnostic)
 * Manages widgets on the canvas, mode, MCP connections, chat history.
 *
 * Reactivity: subscribe(fn) / getSnapshot() pattern (useSyncExternalStore compatible).
 *
 * ---------------------------------------------------------------------------
 * Unified server model (2026-04-23 debloat)
 * ---------------------------------------------------------------------------
 *
 * Historically this store had TWO parallel surfaces for MCP servers:
 *   - `mcpUrl` / `mcpName` / `mcpConnected` / `mcpConnecting` / `mcpTools`
 *     (flat, single-server or comma-joined multi) driven by legacy
 *     `setMcpConnected`/`setMcpConnecting`/`setMcpError` setters.
 *   - `dataServers: DataServer[]` (list, managed by MultiMcpBridge)
 *
 * They were the same concept. The legacy setters and the `primary` flag have
 * been removed; writes go through `addDataServer` / `setDataServerMeta` /
 * `setDataServerEnabled` / `addMcpServer` (url shorthand) exclusively. Flat
 * getters (`mcpConnected`, `mcpName`, `mcpUrl`, `mcpConnecting`, `mcpTools`)
 * remain as read-only derivations over the server list for UI back-compat.
 */

import { encode, decode } from '../hyperskills.js';

export type WidgetType =
  | 'stat' | 'kv' | 'list' | 'chart' | 'alert' | 'code' | 'text' | 'actions' | 'tags'
  | 'stat-card' | 'data-table' | 'timeline' | 'profile' | 'trombinoscope' | 'json-viewer'
  | 'hemicycle' | 'chart-rich' | 'cards' | 'grid-data' | 'sankey' | 'map' | 'log'
  | 'gallery' | 'carousel' | 'd3' | 'js-sandbox'
  | (string & {});

/** @deprecated Use WidgetType */
export type BlockType = WidgetType;

export type Mode = 'auto' | 'drag' | 'chat';
export type LLMId = 'haiku' | 'sonnet' | 'gemma-e2b' | 'gemma-e4b' | 'local';

export interface Widget {
  id: string;
  type: WidgetType;
  data: Record<string, unknown>;
}

/** @deprecated Use Widget */
export type Block = Widget;

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: boolean;
}

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

/**
 * Single MCP server entry — the one true shape.
 * All servers are equal; there is no "primary" concept. The MultiMcpBridge
 * singleton reconciles connection state across all entries.
 */
export interface DataServer {
  name: string;         // user-chosen label
  url: string;
  kind: 'data';         // legacy field, kept for schema stability
  enabled: boolean;     // user intent
  connected: boolean;   // handshake completed
  connecting?: boolean;
  tools?: McpToolInfo[];
  recipes?: { name: string; description?: string; body?: string }[];
  error?: string;
}

export interface CanvasSnapshot {
  blocks: Widget[];
  mode: Mode;
  llm: LLMId;
  mcpUrl: string;
  mcpConnected: boolean;
  mcpConnecting: boolean;
  mcpName: string;
  mcpTools: McpToolInfo[];
  messages: ChatMsg[];
  generating: boolean;
  statusText: string;
  statusColor: string;
  themeOverrides: Record<string, string>;
  enabledServerIds: string[];
  dataServers: DataServer[];
  blockCount: number;
  isEmpty: boolean;
}

type Listener = () => void;

function uuid() { return 'w_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
function msgId() { return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

const NAME_ALIAS: Record<string, string> = { 'moulineuse': 'Tricoteuses' };
function aliasName(n: string): string { return NAME_ALIAS[n] ?? n; }

function createCanvasVanilla() {
  const listeners = new Set<Listener>();
  function notify() { listeners.forEach(fn => fn()); }

  // ── State ──────────────────────────────────────────────────────────────
  let _blocks: Widget[] = [];
  let _mode: Mode = 'drag';
  let _llm: LLMId = 'haiku';
  let _messages: ChatMsg[] = [];
  let _generating = false;
  let _themeOverrides: Record<string, string> = {};
  let _enabledServerIds: string[] = ['autoui'];
  // Single source of truth for MCP servers — agent MCP entries and data-only
  // entries all live here. `primary: true` marks the agent MCP.
  let _servers: DataServer[] = [];

  // ── Helpers over _servers ──────────────────────────────────────────────
  function connectedServers(): DataServer[] {
    return _servers.filter((s) => s.connected);
  }
  function anyConnecting(): boolean {
    return _servers.some((s) => s.connecting);
  }
  function unionTools(): McpToolInfo[] {
    const out: McpToolInfo[] = [];
    for (const s of _servers) if (s.connected && Array.isArray(s.tools)) out.push(...s.tools);
    return out;
  }
  function displayName(): string {
    const connected = connectedServers();
    if (connected.length === 0) return '';
    if (connected.length === 1) return aliasName(connected[0].name);
    return connected.map((s) => aliasName(s.name)).join(', ');
  }

  // ── Derived status strings (used by the header / toast) ────────────────
  function statusText(): string {
    if (anyConnecting()) return '● connexion…';
    const errored = _servers.find((s) => s.error && !s.connected);
    if (errored) return `● erreur: ${errored.error}`;
    const connected = connectedServers();
    if (connected.length === 0) return '● no MCP connected';
    return `● ${displayName()} · ${unionTools().length} tools`;
  }
  function statusColor(): string {
    if (anyConnecting()) return 'text-amber-400';
    const errored = _servers.find((s) => s.error && !s.connected);
    if (errored) return 'text-red-400';
    return connectedServers().length > 0 ? 'text-teal-400' : 'text-zinc-600';
  }

  // ── Server list actions (public, stable) ───────────────────────────────
  function addDataServer(desc: { name: string; url: string }): DataServer {
    const existing = _servers.find((s) => s.name === desc.name);
    if (existing) return existing;
    const srv: DataServer = {
      name: desc.name,
      url: desc.url,
      kind: 'data',
      enabled: true,
      connected: false,
    };
    _servers = [..._servers, srv];
    notify();
    return srv;
  }

  /**
   * Add a server by URL alone (derives name from the URL host). Returns the
   * canvas name so callers can reference it later.
   */
  function addMcpServer(url: string): string {
    if (!url) return '';
    let name: string;
    try { name = new URL(url, 'http://local').host || url; }
    catch { name = url; }
    addDataServer({ name, url });
    setDataServerEnabled(name, true);
    return name;
  }

  function removeDataServer(name: string): boolean {
    const before = _servers.length;
    _servers = _servers.filter((s) => s.name !== name);
    if (_servers.length !== before) { notify(); return true; }
    return false;
  }

  function getDataServer(name: string): DataServer | undefined {
    return _servers.find((s) => s.name === name);
  }

  function setDataServerMeta(name: string, patch: Partial<Omit<DataServer, 'name' | 'url' | 'kind'>>): void {
    const idx = _servers.findIndex((s) => s.name === name);
    if (idx < 0) return;
    _servers = _servers.map((s, i) => i === idx ? { ...s, ...patch } : s);
    notify();
  }

  function setDataServerEnabled(name: string, enabled: boolean): boolean {
    const s = _servers.find((x) => x.name === name);
    if (!s) return false;
    if (s.enabled === enabled) return true;
    _servers = _servers.map((x) => x.name === name ? { ...x, enabled } : x);
    notify();
    return true;
  }

  function toggleDataServer(name: string): boolean {
    const s = _servers.find((x) => x.name === name);
    if (!s) return false;
    return setDataServerEnabled(name, !s.enabled);
  }

  // ── Widget actions ─────────────────────────────────────────────────────
  function addWidget(type: WidgetType, data: Record<string, unknown> = {}): Widget {
    const widget: Widget = { id: uuid(), type, data };
    _blocks = [..._blocks, widget];
    notify();
    return widget;
  }
  const addBlock = addWidget;
  function removeBlock(id: string) {
    _blocks = _blocks.filter((b) => b.id !== id);
    notify();
  }
  function updateBlock(id: string, data: Partial<Record<string, unknown>>) {
    _blocks = _blocks.map((b) => b.id === id ? { ...b, data: { ...b.data, ...data } } : b);
    notify();
  }
  function moveBlock(fromId: string, toId: string) {
    const fi = _blocks.findIndex((b) => b.id === fromId);
    const ti = _blocks.findIndex((b) => b.id === toId);
    if (fi < 0 || ti < 0 || fi === ti) return;
    const next = [..._blocks];
    const [moved] = next.splice(fi, 1);
    next.splice(ti, 0, moved);
    _blocks = next;
    notify();
  }
  function clearBlocks() { _blocks = []; notify(); }
  function setBlocks(newBlocks: Widget[]) { _blocks = newBlocks; notify(); }

  // ── Chat ───────────────────────────────────────────────────────────────
  function addMsg(role: ChatMsg['role'], content: string, thinking = false): ChatMsg {
    const msg: ChatMsg = { id: msgId(), role, content, thinking };
    _messages = [..._messages, msg];
    notify();
    return msg;
  }
  function updateMsg(id: string, content: string, thinking = false) {
    _messages = _messages.map((m) => m.id === id ? { ...m, content, thinking } : m);
    notify();
  }
  function clearMessages() { _messages = []; notify(); }

  // ── Theme ──────────────────────────────────────────────────────────────
  function setThemeOverrides(overrides: Record<string, string>) {
    _themeOverrides = overrides;
    notify();
  }

  // ── Enabled servers (kept for UI server catalogue) ─────────────────────
  function setEnabledServers(ids: string[]) {
    _enabledServerIds = ids;
    notify();
  }

  // ── HyperSkill ─────────────────────────────────────────────────────────
  function buildSkillJSON() {
    const first = connectedServers()[0] ?? _servers[0];
    const skill: Record<string, unknown> = {
      version: '1.0',
      name: 'skill-' + Date.now(),
      created: new Date().toISOString(),
      mcp: first?.url ?? '',
      llm: _llm,
      blocks: _blocks.map((b) => ({ type: b.type, data: JSON.parse(JSON.stringify(b.data)) })),
    };
    if (Object.keys(_themeOverrides).length > 0) skill.theme = _themeOverrides;
    if (_enabledServerIds.length > 0) skill.servers = _enabledServerIds;
    return skill;
  }

  async function buildHyperskillParam(): Promise<string> {
    const json = JSON.stringify(buildSkillJSON());
    // Skip gzip for small payloads — overhead exceeds savings under ~1KB.
    const url = await encode('https://x.local', json, { compress: json.length < 1024 ? 'none' : 'gz' });
    return new URL(url).searchParams.get('hs')!;
  }

  async function loadFromParam(param: string): Promise<boolean> {
    function applySkill(skill: {
      mcp?: string; llm?: LLMId;
      theme?: Record<string, string>;
      servers?: string[];
      blocks?: { type: WidgetType; data: Record<string, unknown> }[];
    }) {
      if (skill.mcp) addMcpServer(skill.mcp);
      if (skill.llm) _llm = skill.llm;
      if (skill.theme) _themeOverrides = skill.theme;
      if (skill.servers) _enabledServerIds = skill.servers;
      if (skill.blocks) {
        _blocks = skill.blocks.map((b) => ({ id: uuid(), type: b.type, data: b.data }));
      }
      notify();
    }
    try {
      const { content: json } = await decode(param);
      applySkill(JSON.parse(json));
      return true;
    } catch { /* fall through */ }
    try {
      let b64 = param.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const json = decodeURIComponent(escape(atob(b64)));
      applySkill(JSON.parse(json));
      return true;
    } catch {
      return false;
    }
  }

  async function loadFromUrl(url: string): Promise<boolean> {
    try {
      const { content: raw } = await decode(url);
      const decoded = JSON.parse(raw) as {
        meta?: Record<string, unknown>;
        content?: { blocks?: { type: WidgetType; data: Record<string, unknown> }[] };
        servers?: string[];
      };
      if (decoded.meta?.mcp) addMcpServer(decoded.meta.mcp as string);
      if (decoded.meta?.llm) _llm = decoded.meta.llm as LLMId;
      if (decoded.meta?.theme) _themeOverrides = decoded.meta.theme as Record<string, string>;
      const servers = (decoded.servers ?? (decoded.meta?.servers as string[] | undefined));
      if (Array.isArray(servers)) _enabledServerIds = servers;
      if (decoded.content?.blocks) _blocks = decoded.content.blocks.map((b) => ({ id: uuid(), type: b.type, data: b.data }));
      notify();
      return true;
    } catch {
      return false;
    }
  }

  // ── Snapshot (fields kept for API stability) ───────────────────────────
  function getSnapshot(): CanvasSnapshot {
    const first = connectedServers()[0] ?? _servers[0];
    return {
      blocks: _blocks,
      mode: _mode,
      llm: _llm,
      mcpUrl: first?.url ?? '',
      mcpConnected: _servers.some((s) => s.connected),
      mcpConnecting: anyConnecting(),
      mcpName: first && first.connected ? aliasName(first.name) : '',
      mcpTools: unionTools(),
      messages: _messages,
      generating: _generating,
      statusText: statusText(),
      statusColor: statusColor(),
      themeOverrides: _themeOverrides,
      enabledServerIds: _enabledServerIds,
      dataServers: _servers,
      blockCount: _blocks.length,
      isEmpty: _blocks.length === 0,
    };
  }

  function subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }

  return {
    // Reactive getters (read-side)
    get blocks() { return _blocks; },
    get mode() { return _mode; },
    set mode(v: Mode) { _mode = v; notify(); },
    get llm() { return _llm; },
    set llm(v: LLMId) { _llm = v; notify(); },
    get mcpUrl() { return (connectedServers()[0] ?? _servers[0])?.url ?? ''; },
    set mcpUrl(v: string) { addMcpServer(v); },
    get mcpConnected() { return _servers.some((s) => s.connected); },
    get mcpConnecting() { return anyConnecting(); },
    get mcpName() {
      const s = connectedServers()[0];
      return s ? aliasName(s.name) : '';
    },
    get mcpTools() { return unionTools(); },
    get messages() { return _messages; },
    get generating() { return _generating; },
    set generating(v: boolean) { _generating = v; notify(); },
    get statusText() { return statusText(); },
    get statusColor() { return statusColor(); },
    get blockCount() { return _blocks.length; },
    get isEmpty() { return _blocks.length === 0; },

    setMode(m: Mode) { _mode = m; notify(); },
    setLlm(l: LLMId) { _llm = l; notify(); },
    setGenerating(g: boolean) { _generating = g; notify(); },

    addWidget, addBlock,
    removeBlock, updateBlock, moveBlock, clearBlocks, setBlocks,
    addMsg, updateMsg, clearMessages,

    get themeOverrides() { return _themeOverrides; },
    setThemeOverrides,

    get enabledServerIds() { return _enabledServerIds; },
    setEnabledServers,

    // Server list — unified store. `dataServers` kept as accessor name for
    // schema/API stability; it returns ALL servers (primary + data-only).
    get dataServers() { return _servers; },
    set dataServers(v: DataServer[]) { _servers = Array.isArray(v) ? v : []; notify(); },
    addDataServer,
    addMcpServer,
    removeDataServer,
    getDataServer,
    setDataServerMeta,
    setDataServerEnabled,
    toggleDataServer,

    buildSkillJSON, buildHyperskillParam, loadFromParam, loadFromUrl,

    subscribe,
    getSnapshot,
  };
}

export const canvasVanilla = createCanvasVanilla();
