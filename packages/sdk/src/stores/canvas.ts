/**
 * Canvas state store — Vanilla (framework-agnostic)
 * Manages blocks on the canvas, mode, MCP connection, chat history
 *
 * This is the framework-agnostic version of the canvas store.
 * For Svelte 5 reactivity, use @webmcp-auto-ui/sdk/canvas (Svelte runes)
 * or @webmcp-auto-ui/ui/canvas (adapter).
 */

import { encode, decode } from 'hyperskills';

export type BlockType =
  | 'stat' | 'kv' | 'list' | 'chart' | 'alert' | 'code' | 'text' | 'actions' | 'tags'
  | 'stat-card' | 'data-table' | 'timeline' | 'profile' | 'trombinoscope' | 'json-viewer'
  | 'hemicycle' | 'chart-rich' | 'cards' | 'grid-data' | 'sankey' | 'map' | 'log'
  | 'gallery' | 'carousel' | 'd3';

export type Mode = 'auto' | 'drag' | 'chat';
export type LLMId = 'haiku' | 'sonnet' | 'gemma-e2b' | 'gemma-e4b';

export interface Block {
  id: string;
  type: BlockType;
  data: Record<string, unknown>;
}

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

export interface CanvasSnapshot {
  blocks: Block[];
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
  blockCount: number;
  isEmpty: boolean;
}

type Listener = () => void;

function uuid() {
  return 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function msgId() {
  return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function createCanvasVanilla() {
  // ── Subscribers ────────────────────────────────────────────────────────
  const listeners = new Set<Listener>();
  function notify() { listeners.forEach(fn => fn()); }

  // ── State ──────────────────────────────────────────────────────────────
  let _blocks: Block[] = [];
  let _mode: Mode = 'drag';
  let _llm: LLMId = 'haiku';
  let _mcpUrl = '';
  let _mcpConnected = false;
  let _mcpConnecting = false;
  let _mcpName = '';
  let _mcpTools: McpToolInfo[] = [];
  let _messages: ChatMsg[] = [];
  let _generating = false;
  let _statusText = '● aucun MCP connecté';
  let _statusColor = 'text-zinc-600';
  let _themeOverrides: Record<string, string> = {};

  // ── Block actions ──────────────────────────────────────────────────────
  function addBlock(type: BlockType, data: Record<string, unknown> = {}): Block {
    const block: Block = { id: uuid(), type, data };
    _blocks = [..._blocks, block];
    notify();
    return block;
  }

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

  function clearBlocks() {
    _blocks = [];
    notify();
  }

  function setBlocks(newBlocks: Block[]) {
    _blocks = newBlocks;
    notify();
  }

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

  function clearMessages() {
    _messages = [];
    notify();
  }

  // ── MCP ────────────────────────────────────────────────────────────────
  function setMcpConnecting(connecting: boolean) {
    _mcpConnecting = connecting;
    if (connecting) {
      _statusText = '● connexion…';
      _statusColor = 'text-amber-400';
    }
    notify();
  }

  function setMcpConnected(
    connected: boolean,
    name?: string,
    tools?: McpToolInfo[]
  ) {
    _mcpConnected = connected;
    if (name) _mcpName = name;
    if (tools) _mcpTools = tools;
    if (connected) {
      _statusText = `● ${name} · ${tools?.length ?? 0} tools`;
      _statusColor = 'text-teal-400';
    } else {
      _statusText = '● aucun MCP connecté';
      _statusColor = 'text-zinc-600';
    }
    notify();
  }

  function setMcpError(err: string) {
    _mcpConnected = false;
    _mcpConnecting = false;
    _statusText = `● erreur: ${err}`;
    _statusColor = 'text-red-400';
    notify();
  }

  // ── Theme ──────────────────────────────────────────────────────────────
  function setThemeOverrides(overrides: Record<string, string>) {
    _themeOverrides = overrides;
    notify();
  }

  // ── HyperSkill ─────────────────────────────────────────────────────────
  function buildSkillJSON() {
    const skill: Record<string, unknown> = {
      version: '1.0',
      name: 'skill-' + Date.now(),
      created: new Date().toISOString(),
      mcp: _mcpUrl,
      llm: _llm,
      blocks: _blocks.map((b) => ({ type: b.type, data: b.data })),
    };
    if (Object.keys(_themeOverrides).length > 0) skill.theme = _themeOverrides;
    return skill;
  }

  async function buildHyperskillParam(): Promise<string> {
    const json = JSON.stringify(buildSkillJSON());
    const compress = json.length > 6144 ? 'gz' as const : undefined;
    const url = await encode('https://x.local', json, compress ? { compress } : {});
    return new URL(url).searchParams.get('hs')!;
  }

  async function loadFromParam(param: string): Promise<boolean> {
    try {
      let json: string;

      if (param.startsWith('gz.')) {
        let b64 = param.slice(3).replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const compressed = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const ds = new DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        writer.write(compressed);
        writer.close();
        json = await new Response(ds.readable).text();
      } else {
        let b64 = param.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        json = decodeURIComponent(escape(atob(b64)));
      }

      const skill = JSON.parse(json) as {
        mcp?: string; llm?: LLMId;
        theme?: Record<string, string>;
        blocks?: { type: BlockType; data: Record<string, unknown> }[];
      };
      if (skill.mcp) _mcpUrl = skill.mcp;
      if (skill.llm) _llm = skill.llm;
      if (skill.theme) _themeOverrides = skill.theme;
      if (skill.blocks) {
        _blocks = skill.blocks.map((b) => ({ id: uuid(), type: b.type, data: b.data }));
      }
      notify();
      return true;
    } catch {
      return false;
    }
  }

  // ── loadFromUrl ────────────────────────────────────────────────────────
  async function loadFromUrl(url: string): Promise<boolean> {
    try {
      const { content: raw } = await decode(url);
      const decoded = JSON.parse(raw) as { meta?: Record<string, unknown>; content?: { blocks?: { type: BlockType; data: Record<string, unknown> }[] } };
      if (decoded.meta?.mcp) _mcpUrl = decoded.meta.mcp as string;
      if (decoded.meta?.llm) _llm = decoded.meta.llm as LLMId;
      if (decoded.meta?.theme) _themeOverrides = decoded.meta.theme as Record<string, string>;
      if (decoded.content?.blocks) _blocks = decoded.content.blocks.map((b) => ({ id: uuid(), type: b.type, data: b.data }));
      notify();
      return true;
    } catch {
      return false;
    }
  }

  // ── Snapshot ────────────────────────────────────────────────────────────
  function getSnapshot(): CanvasSnapshot {
    return {
      blocks: _blocks,
      mode: _mode,
      llm: _llm,
      mcpUrl: _mcpUrl,
      mcpConnected: _mcpConnected,
      mcpConnecting: _mcpConnecting,
      mcpName: _mcpName,
      mcpTools: _mcpTools,
      messages: _messages,
      generating: _generating,
      statusText: _statusText,
      statusColor: _statusColor,
      themeOverrides: _themeOverrides,
      blockCount: _blocks.length,
      isEmpty: _blocks.length === 0,
    };
  }

  // ── Subscribe ──────────────────────────────────────────────────────────
  function subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }

  // ── Return public API ──────────────────────────────────────────────────
  return {
    // State getters + setters
    get blocks() { return _blocks; },
    get mode() { return _mode; },
    set mode(v: Mode) { _mode = v; notify(); },
    get llm() { return _llm; },
    set llm(v: LLMId) { _llm = v; notify(); },
    get mcpUrl() { return _mcpUrl; },
    set mcpUrl(v: string) { _mcpUrl = v; notify(); },
    get mcpConnected() { return _mcpConnected; },
    get mcpConnecting() { return _mcpConnecting; },
    get mcpName() { return _mcpName; },
    get mcpTools() { return _mcpTools; },
    get messages() { return _messages; },
    get generating() { return _generating; },
    set generating(v: boolean) { _generating = v; notify(); },
    get statusText() { return _statusText; },
    get statusColor() { return _statusColor; },
    get blockCount() { return _blocks.length; },
    get isEmpty() { return _blocks.length === 0; },

    // Setters (kept for backward compat)
    setMode(m: Mode) { _mode = m; notify(); },
    setLlm(l: LLMId) { _llm = l; notify(); },
    setMcpUrl(u: string) { _mcpUrl = u; notify(); },
    setGenerating(g: boolean) { _generating = g; notify(); },

    // Block actions
    addBlock, removeBlock, updateBlock, moveBlock, clearBlocks, setBlocks,

    // Chat
    addMsg, updateMsg, clearMessages,

    // MCP
    setMcpConnecting, setMcpConnected, setMcpError,

    // Theme
    get themeOverrides() { return _themeOverrides; },
    setThemeOverrides,

    // HyperSkill
    buildSkillJSON, buildHyperskillParam, loadFromParam, loadFromUrl,

    // Framework-agnostic reactivity
    subscribe,
    getSnapshot,
  };
}

export const canvasVanilla = createCanvasVanilla();
