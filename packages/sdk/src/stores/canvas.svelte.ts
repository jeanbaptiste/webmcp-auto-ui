/**
 * Canvas state store — Svelte 5 runes
 * Manages blocks on the canvas, mode, MCP connection, chat history
 */

export type BlockType =
  | 'stat' | 'kv' | 'list' | 'chart' | 'alert' | 'code' | 'text' | 'actions' | 'tags'
  | 'stat-card' | 'data-table' | 'timeline' | 'profile' | 'trombinoscope' | 'json-viewer'
  | 'hemicycle' | 'chart-rich' | 'cards' | 'grid-data' | 'sankey' | 'map' | 'log';

export type Mode = 'auto' | 'drag' | 'chat';
export type LLMId = 'haiku' | 'sonnet' | 'gemma-e2b';

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
  let mode = $state<Mode>('auto');
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
    statusText = `● erreur: ${err.slice(0, 40)}`;
    statusColor = 'text-red-400';
  }

  // ── HyperSkill ───────────────────────────────────────────────────────────
  function buildSkillJSON() {
    return {
      version: '1.0',
      name: 'skill-' + Date.now(),
      created: new Date().toISOString(),
      mcp: mcpUrl,
      llm,
      blocks: blocks.map((b) => ({ type: b.type, data: b.data })),
    };
  }

  function buildHyperskillParam(): string {
    const json = JSON.stringify(buildSkillJSON());
    return btoa(unescape(encodeURIComponent(json)));
  }

  function loadFromParam(param: string): boolean {
    try {
      const json = decodeURIComponent(escape(atob(param)));
      const skill = JSON.parse(json) as {
        mcp?: string; llm?: LLMId;
        blocks?: { type: BlockType; data: Record<string, unknown> }[];
      };
      if (skill.mcp) mcpUrl = skill.mcp;
      if (skill.llm) llm = skill.llm;
      if (skill.blocks) {
        blocks = skill.blocks.map((b) => ({ id: uuid(), type: b.type, data: b.data }));
      }
      return true;
    } catch {
      return false;
    }
  }

  // ── Return public API ────────────────────────────────────────────────────
  return {
    // State getters (reactive)
    get blocks() { return blocks; },
    get mode() { return mode; },
    get llm() { return llm; },
    get mcpUrl() { return mcpUrl; },
    get mcpConnected() { return mcpConnected; },
    get mcpConnecting() { return mcpConnecting; },
    get mcpName() { return mcpName; },
    get mcpTools() { return mcpTools; },
    get messages() { return messages; },
    get generating() { return generating; },
    get statusText() { return statusText; },
    get statusColor() { return statusColor; },
    get blockCount() { return blockCount; },
    get isEmpty() { return isEmpty; },

    // Setters
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

    // HyperSkill
    buildSkillJSON, buildHyperskillParam, loadFromParam,
  };
}

export const canvas = createCanvas();
