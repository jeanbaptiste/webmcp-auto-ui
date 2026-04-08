/**
 * Canvas state store — Svelte 5 runes
 * Manages blocks on the canvas, mode, MCP connection, chat history
 */

import { decode } from 'hyperskills';

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

function uuid() {
  return 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function msgId() {
  return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function createCanvas() {
  // ── State ────────────────────────────────────────────────────────────────
  let blocks = $state<Block[]>([]);
  let mode = $state<Mode>('drag');
  let llm = $state<LLMId>('haiku');
  let mcpUrl = $state('');
  let mcpConnected = $state(false);
  let mcpConnecting = $state(false);
  let mcpName = $state('');
  let mcpTools = $state<McpToolInfo[]>([]);
  let messages = $state<ChatMsg[]>([]);
  let generating = $state(false);
  let statusText = $state('● aucun MCP connecté');
  let statusColor = $state('text-zinc-600');

  // ── Derived ──────────────────────────────────────────────────────────────
  const blockCount = $derived(blocks.length);
  const isEmpty = $derived(blocks.length === 0);

  // ── Block actions ────────────────────────────────────────────────────────
  function addBlock(type: BlockType, data: Record<string, unknown> = {}): Block {
    const block: Block = { id: uuid(), type, data };
    blocks = [...blocks, block];
    return block;
  }

  function removeBlock(id: string) {
    blocks = blocks.filter((b) => b.id !== id);
  }

  function updateBlock(id: string, data: Partial<Record<string, unknown>>) {
    blocks = blocks.map((b) => b.id === id ? { ...b, data: { ...b.data, ...data } } : b);
  }

  function moveBlock(fromId: string, toId: string) {
    const fi = blocks.findIndex((b) => b.id === fromId);
    const ti = blocks.findIndex((b) => b.id === toId);
    if (fi < 0 || ti < 0 || fi === ti) return;
    const next = [...blocks];
    const [moved] = next.splice(fi, 1);
    next.splice(ti, 0, moved);
    blocks = next;
  }

  function clearBlocks() {
    blocks = [];
  }

  function setBlocks(newBlocks: Block[]) {
    blocks = newBlocks;
  }

  // ── Chat ─────────────────────────────────────────────────────────────────
  function addMsg(role: ChatMsg['role'], content: string, thinking = false): ChatMsg {
    const msg: ChatMsg = { id: msgId(), role, content, thinking };
    messages = [...messages, msg];
    return msg;
  }

  function updateMsg(id: string, content: string, thinking = false) {
    messages = messages.map((m) => m.id === id ? { ...m, content, thinking } : m);
  }

  function clearMessages() {
    messages = [];
  }

  // ── MCP ──────────────────────────────────────────────────────────────────
  function setMcpConnecting(connecting: boolean) {
    mcpConnecting = connecting;
    if (connecting) {
      statusText = '● connexion…';
      statusColor = 'text-amber-400';
    }
  }

  function setMcpConnected(
    connected: boolean,
    name?: string,
    tools?: McpToolInfo[]
  ) {
    mcpConnected = connected;
    if (name) mcpName = name;
    if (tools) mcpTools = tools;
    if (connected) {
      statusText = `● ${name} · ${tools?.length ?? 0} tools`;
      statusColor = 'text-teal-400';
    } else {
      statusText = '● aucun MCP connecté';
      statusColor = 'text-zinc-600';
    }
  }

  function setMcpError(err: string) {
    mcpConnected = false;
    mcpConnecting = false;
    statusText = `● erreur: ${err}`;
    statusColor = 'text-red-400';
  }

  // ── Theme ────────────────────────────────────────────────────────────────
  let themeOverrides = $state<Record<string, string>>({});

  function setThemeOverrides(overrides: Record<string, string>) {
    themeOverrides = overrides;
  }

  // ── HyperSkill ───────────────────────────────────────────────────────────
  function buildSkillJSON() {
    const skill: Record<string, unknown> = {
      version: '1.0',
      name: 'skill-' + Date.now(),
      created: new Date().toISOString(),
      mcp: mcpUrl,
      llm,
      blocks: blocks.map((b) => ({ type: b.type, data: b.data })),
    };
    if (Object.keys(themeOverrides).length > 0) skill.theme = themeOverrides;
    return skill;
  }

  async function buildHyperskillParam(): Promise<string> {
    const json = JSON.stringify(buildSkillJSON());
    const bytes = new TextEncoder().encode(json);
    // Auto-compress with gzip when payload exceeds 6 KB to keep URLs under nginx limits
    if (bytes.length > 6144) {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const compressed = new Uint8Array(await new Response(cs.readable).arrayBuffer());
      const b64 = btoa(String.fromCharCode(...compressed))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return 'gz.' + b64;
    }
    // Small payloads: plain base64url
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function loadFromParam(param: string): Promise<boolean> {
    try {
      let json: string;

      if (param.startsWith('gz.')) {
        // Compressed: gz.<base64url-encoded gzip data>
        let b64 = param.slice(3).replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const compressed = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const ds = new DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        writer.write(compressed);
        writer.close();
        json = await new Response(ds.readable).text();
      } else {
        // Plain base64url
        let b64 = param.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        json = decodeURIComponent(escape(atob(b64)));
      }

      const skill = JSON.parse(json) as {
        mcp?: string; llm?: LLMId;
        theme?: Record<string, string>;
        blocks?: { type: BlockType; data: Record<string, unknown> }[];
      };
      if (skill.mcp) mcpUrl = skill.mcp;
      if (skill.llm) llm = skill.llm;
      if (skill.theme) themeOverrides = skill.theme;
      if (skill.blocks) {
        blocks = skill.blocks.map((b) => ({ id: uuid(), type: b.type, data: b.data }));
      }
      return true;
    } catch {
      return false;
    }
  }

  // ── loadFromUrl ──────────────────────────────────────────────────────────
  async function loadFromUrl(url: string): Promise<boolean> {
    try {
      const { content: raw } = await decode(url);
      const decoded = JSON.parse(raw) as { meta?: Record<string, unknown>; content?: { blocks?: { type: BlockType; data: Record<string, unknown> }[] } };
      if (decoded.meta?.mcp) mcpUrl = decoded.meta.mcp as string;
      if (decoded.meta?.llm) llm = decoded.meta.llm as LLMId;
      if (decoded.meta?.theme) themeOverrides = decoded.meta.theme as Record<string, string>;
      if (decoded.content?.blocks) blocks = decoded.content.blocks.map((b) => ({ id: uuid(), type: b.type, data: b.data }));
      return true;
    } catch {
      return false;
    }
  }

  // ── Return public API ────────────────────────────────────────────────────
  return {
    // State getters + setters (reactive — supports bind:)
    get blocks() { return blocks; },
    get mode() { return mode; },
    set mode(v: Mode) { mode = v; },
    get llm() { return llm; },
    set llm(v: LLMId) { llm = v; },
    get mcpUrl() { return mcpUrl; },
    set mcpUrl(v: string) { mcpUrl = v; },
    get mcpConnected() { return mcpConnected; },
    get mcpConnecting() { return mcpConnecting; },
    get mcpName() { return mcpName; },
    get mcpTools() { return mcpTools; },
    get messages() { return messages; },
    get generating() { return generating; },
    set generating(v: boolean) { generating = v; },
    get statusText() { return statusText; },
    get statusColor() { return statusColor; },
    get blockCount() { return blockCount; },
    get isEmpty() { return isEmpty; },

    // Setters (kept for backward compat)
    setMode(m: Mode) { mode = m; },
    setLlm(l: LLMId) { llm = l; },
    setMcpUrl(u: string) { mcpUrl = u; },
    setGenerating(g: boolean) { generating = g; },

    // Block actions
    addBlock, removeBlock, updateBlock, moveBlock, clearBlocks, setBlocks,

    // Chat
    addMsg, updateMsg, clearMessages,

    // MCP
    setMcpConnecting, setMcpConnected, setMcpError,

    // Theme
    get themeOverrides() { return themeOverrides; },
    setThemeOverrides,

    // HyperSkill
    buildSkillJSON, buildHyperskillParam, loadFromParam, loadFromUrl,
  };
}

export const canvas = createCanvas();
