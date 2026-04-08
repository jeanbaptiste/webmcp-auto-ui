/**
 * Canvas Svelte adapter — wraps the vanilla canvas store with Svelte 5 runes
 *
 * Usage:
 *   import { canvas } from '@webmcp-auto-ui/ui/canvas';
 *
 * This provides the same API as the vanilla store but with Svelte 5 reactivity.
 * For apps already importing from @webmcp-auto-ui/sdk/canvas, no change is needed.
 */

import { canvasVanilla } from '@webmcp-auto-ui/sdk/canvas-vanilla';
import type { Block, BlockType, Mode, LLMId, ChatMsg, McpToolInfo } from '@webmcp-auto-ui/sdk/canvas-vanilla';

export type { Block, BlockType, Mode, LLMId, ChatMsg, McpToolInfo };

function createSvelteCanvas() {
  // Reactive mirror of the vanilla store state
  let blocks = $state<Block[]>(canvasVanilla.blocks);
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

  // Derived
  const blockCount = $derived(blocks.length);
  const isEmpty = $derived(blocks.length === 0);

  // Sync from vanilla store changes
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
  });

  return {
    // State getters + setters (reactive)
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

    // Setters
    setMode: canvasVanilla.setMode.bind(canvasVanilla),
    setLlm: canvasVanilla.setLlm.bind(canvasVanilla),
    setMcpUrl: canvasVanilla.setMcpUrl.bind(canvasVanilla),
    setGenerating: canvasVanilla.setGenerating.bind(canvasVanilla),

    // Block actions
    addBlock: canvasVanilla.addBlock.bind(canvasVanilla),
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

    // HyperSkill
    buildSkillJSON: canvasVanilla.buildSkillJSON.bind(canvasVanilla),
    buildHyperskillParam: canvasVanilla.buildHyperskillParam.bind(canvasVanilla),
    loadFromParam: canvasVanilla.loadFromParam.bind(canvasVanilla),
    loadFromUrl: canvasVanilla.loadFromUrl.bind(canvasVanilla),
  };
}

export const canvas = createSvelteCanvas();
