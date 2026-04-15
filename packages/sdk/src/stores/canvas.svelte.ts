/**
 * Canvas state store — Svelte 5 runes wrapper
 * Thin reactive wrapper around the framework-agnostic canvas store (canvas.ts).
 *
 * All state mutations go through the vanilla store; this file only adds
 * Svelte 5 $state/$derived reactivity via subscribe().
 */

import { canvasVanilla } from './canvas.js';
import type { Widget, WidgetType, Mode, LLMId, ChatMsg, McpToolInfo } from './canvas.js';

// Re-export types (including deprecated aliases)
export type { Widget, WidgetType, Mode, LLMId, ChatMsg, McpToolInfo };
export type { Block, BlockType, CanvasSnapshot } from './canvas.js';

function createCanvas() {
  // ── Reactive mirror of vanilla state ────────────────────────────────────
  let blocks = $state<Widget[]>(canvasVanilla.blocks);
  let mode = $state<Mode>(canvasVanilla.mode);
  let llm = $state<LLMId>(canvasVanilla.llm);
  let mcpUrl = $state(canvasVanilla.mcpUrl);
  let mcpConnected = $state(canvasVanilla.mcpConnected);
  let mcpConnecting = $state(canvasVanilla.mcpConnecting);
  let mcpName = $state(canvasVanilla.mcpName);
  let mcpTools = $state<McpToolInfo[]>(canvasVanilla.mcpTools);
  let messages = $state<ChatMsg[]>(canvasVanilla.messages);
  let generating = $state(canvasVanilla.generating);
  let statusText = $state(canvasVanilla.statusText);
  let statusColor = $state(canvasVanilla.statusColor);
  let themeOverrides = $state<Record<string, string>>(canvasVanilla.themeOverrides);
  let enabledServerIds = $state<string[]>(canvasVanilla.enabledServerIds);

  // ── Derived ─────────────────────────────────────────────────────────────
  const blockCount = $derived(blocks.length);
  const isEmpty = $derived(blocks.length === 0);

  // ── Sync from vanilla store on every change ─────────────────────────────
  canvasVanilla.subscribe(() => {
    const s = canvasVanilla.getSnapshot();
    blocks = s.blocks;
    mode = s.mode;
    llm = s.llm;
    mcpUrl = s.mcpUrl;
    mcpConnected = s.mcpConnected;
    mcpConnecting = s.mcpConnecting;
    mcpName = s.mcpName;
    mcpTools = s.mcpTools;
    messages = s.messages;
    generating = s.generating;
    statusText = s.statusText;
    statusColor = s.statusColor;
    themeOverrides = s.themeOverrides;
    enabledServerIds = canvasVanilla.enabledServerIds;
  });

  // ── Return public API ───────────────────────────────────────────────────
  return {
    // State getters + setters (reactive — supports bind:)
    get blocks() { return blocks; },
    get mode() { return mode; },
    set mode(v: Mode) { canvasVanilla.mode = v; },
    get llm() { return llm; },
    set llm(v: LLMId) { canvasVanilla.llm = v; },
    get mcpUrl() { return mcpUrl; },
    set mcpUrl(v: string) { canvasVanilla.mcpUrl = v; },
    get mcpConnected() { return mcpConnected; },
    get mcpConnecting() { return mcpConnecting; },
    get mcpName() { return mcpName; },
    get mcpTools() { return mcpTools; },
    get messages() { return messages; },
    get generating() { return generating; },
    set generating(v: boolean) { canvasVanilla.generating = v; },
    get statusText() { return statusText; },
    get statusColor() { return statusColor; },
    get blockCount() { return blockCount; },
    get isEmpty() { return isEmpty; },

    // Setters (kept for backward compat)
    setMode(m: Mode) { canvasVanilla.setMode(m); },
    setLlm(l: LLMId) { canvasVanilla.setLlm(l); },
    setMcpUrl(u: string) { canvasVanilla.setMcpUrl(u); },
    setGenerating(g: boolean) { canvasVanilla.setGenerating(g); },

    // Widget actions (primary name)
    addWidget: canvasVanilla.addWidget.bind(canvasVanilla),

    // Backward compat alias
    addBlock: canvasVanilla.addBlock.bind(canvasVanilla),

    // Block actions (kept as-is)
    removeBlock: canvasVanilla.removeBlock.bind(canvasVanilla),
    updateBlock: canvasVanilla.updateBlock.bind(canvasVanilla),
    moveBlock: canvasVanilla.moveBlock.bind(canvasVanilla),
    clearBlocks: canvasVanilla.clearBlocks.bind(canvasVanilla),
    setBlocks: canvasVanilla.setBlocks.bind(canvasVanilla),

    // Chat
    addMsg: canvasVanilla.addMsg.bind(canvasVanilla),
    updateMsg: canvasVanilla.updateMsg.bind(canvasVanilla),
    clearMessages: canvasVanilla.clearMessages.bind(canvasVanilla),

    // MCP
    setMcpConnecting: canvasVanilla.setMcpConnecting.bind(canvasVanilla),
    setMcpConnected: canvasVanilla.setMcpConnected.bind(canvasVanilla),
    setMcpError: canvasVanilla.setMcpError.bind(canvasVanilla),

    // Theme
    get themeOverrides() { return themeOverrides; },
    setThemeOverrides: canvasVanilla.setThemeOverrides.bind(canvasVanilla),

    // Enabled servers
    get enabledServerIds() { return enabledServerIds; },
    setEnabledServers: canvasVanilla.setEnabledServers.bind(canvasVanilla),

    // HyperSkill
    buildSkillJSON: canvasVanilla.buildSkillJSON.bind(canvasVanilla),
    buildHyperskillParam: canvasVanilla.buildHyperskillParam.bind(canvasVanilla),
    loadFromParam: canvasVanilla.loadFromParam.bind(canvasVanilla),
    loadFromUrl: canvasVanilla.loadFromUrl.bind(canvasVanilla),
  };
}

export const canvas = createCanvas();
