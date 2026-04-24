/**
 * Reactive agent store for showcase.
 * Manages MCP connection, LLM provider selection, and agent loop execution.
 * Generated blocks are stored here for the page to render.
 */
import { canvas } from '@webmcp-auto-ui/sdk/canvas';
import { canvasVanilla } from '@webmcp-auto-ui/sdk/canvas-vanilla';
import { installMultiMcpBridge, MultiMcpBridge } from '@webmcp-auto-ui/core';
import type { McpMultiClient } from '@webmcp-auto-ui/core';
import {
  runAgentLoop,
  buildSystemPrompt,
  fromMcpTools,
  buildDiscoveryCache,
  ContextRAG,
} from '@webmcp-auto-ui/agent';
import { createAgentLoop } from '@webmcp-auto-ui/ui/agent';
import type { ChatMessage, ToolLayer, McpLayer } from '@webmcp-auto-ui/agent';
import { autoui } from '@webmcp-auto-ui/agent';
import { base } from '$app/paths';

// ── Types ──────────────────────────────────────────────────────────────────
export interface GeneratedBlock {
  id: string;
  type: string;
  label: string;
  data: Record<string, unknown>;
}

// ── Singleton state ────────────────────────────────────────────────────────
// The McpMultiClient is owned by the global bridge at globalThis.__multiMcp.
// It is installed lazily on first access (ensureBridge) — this store module
// may load before the first component mount.
let multiMcpBridge: MultiMcpBridge | null = null;
function ensureBridge(): MultiMcpBridge {
  if (multiMcpBridge) return multiMcpBridge;
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__canvasVanilla = canvasVanilla;
  }
  multiMcpBridge = installMultiMcpBridge({
    getCanvas: () => (globalThis as any).__canvasVanilla ?? canvasVanilla,
  });
  return multiMcpBridge;
}
function getMultiClient(): McpMultiClient {
  return ensureBridge().multiClient;
}
let connectedUrl = $state('');
let connecting = $state(false);
let connectError = $state('');
let generating = $state(false);
let agentStatus = $state('');
let generatedBlocks = $state<GeneratedBlock[]>([]);
let conversationHistory = $state<ChatMessage[]>([]);
let toolCallCount = $state(0);
let lastToolName = $state('');
let elapsed = $state(0);
let abortController = $state<AbortController | null>(null);

// Agent loop composable (provider + Gemma lifecycle + smart defaults + tokens)
const agentLoop = createAgentLoop({
  chatApiBase: `${base}/api/chat`,
  hawkApiBase: `${base}/api/hawk`,
  enabledProviders: ['remote', 'wasm', 'hawk'],
});

// Smart defaults — delegate to composable
function applySmartDefaults() {
  agentLoop.applySmartDefaults();
}

// Nano-RAG (experimental, off by default)
let contextRAGEnabled = $state(false);
let contextRAG = $state<ContextRAG | null>(null);

// ContextRAG lifecycle: called imperatively when toggle changes (not $effect — module-level)
function setContextRAGEnabled(v: boolean) {
  contextRAGEnabled = v;
  if (v && !contextRAG) {
    contextRAG = new ContextRAG({ topK: 5 });
  }
  if (!v && contextRAG) {
    contextRAG.destroy();
    contextRAG = null;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
let blockCounter = 0;
function uid() {
  return 'b' + (++blockCounter) + '_' + Date.now().toString(36);
}

function unloadGemma() {
  agentLoop.unloadGemma();
}

// ── Public API ─────────────────────────────────────────────────────────────

export const agentStore = {
  // Getters
  get connectedUrl() { return connectedUrl; },
  get connecting() { return connecting; },
  get connectError() { return connectError; },
  get generating() { return generating; },
  get agentStatus() { return agentStatus; },
  get generatedBlocks() { return generatedBlocks; },
  get toolCallCount() { return toolCallCount; },
  get lastToolName() { return lastToolName; },
  get elapsed() { return elapsed; },
  get tokenMetrics() { return agentLoop.tokenMetrics; },
  get gemmaStatus() { return agentLoop.gemmaStatus; },
  get gemmaProgress() { return agentLoop.gemmaProgress; },
  get gemmaElapsed() { return agentLoop.gemmaElapsed; },
  get gemmaLoadedMB() { return agentLoop.gemmaLoadedMB; },
  get gemmaTotalMB() { return agentLoop.gemmaTotalMB; },
  get multiClient() { return getMultiClient(); },
  get contextRAGEnabled() { return contextRAGEnabled; },
  set contextRAGEnabled(v: boolean) { setContextRAGEnabled(v); },

  /** Apply smart defaults for the current LLM */
  applySmartDefaults,
  get schemaSanitize() { return agentLoop.schemaSanitize; },
  set schemaSanitize(v: boolean) { agentLoop.schemaSanitize = v; },
  get schemaFlatten() { return agentLoop.schemaFlatten; },
  set schemaFlatten(v: boolean) { agentLoop.schemaFlatten = v; },
  get maxResultLength() { return agentLoop.maxResultLength; },
  set maxResultLength(v: number) { agentLoop.maxResultLength = v; },
  get truncateResults() { return agentLoop.truncateResults; },
  set truncateResults(v: boolean) { agentLoop.truncateResults = v; },
  get compressHistory() { return agentLoop.compressHistoryEnabled; },
  set compressHistory(v: boolean) { agentLoop.compressHistoryEnabled = v; },
  get compressPreview() { return agentLoop.compressPreview; },
  set compressPreview(v: number) { agentLoop.compressPreview = v; },

  /** Connect to an MCP server — routed through the canvas store so the global
   * MultiMcpBridge performs the handshake. Connection state mirrored back via
   * the bridge's writes to `canvas.dataServers`. */
  async connect(url: string) {
    if (!url.trim() || connecting) return;
    // Disconnect previous if any
    if (connectedUrl) {
      await this.disconnect();
    }
    connecting = true;
    connectError = '';
    // Make sure the bridge is installed before mutating the store so its
    // subscription is in place when the data-server appears.
    ensureBridge();
    const provisionalName = canvas.addMcpServer(url.trim());
    connectedUrl = url;

    // Poll briefly for the bridge to report a terminal state (connected or
    // error). The bridge reconciles off a store subscription, so this only
    // needs to wait one microtask tick in the normal case.
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const entry = canvas.dataServers.find(s => s.name === provisionalName);
      if (entry && entry.connected) break;
      if (entry && entry.error) {
        connectError = entry.error;
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    connecting = false;
  },

  /** Disconnect from MCP server — removing the entry from the canvas store
   * triggers the bridge to tear down the underlying connection. */
  async disconnect() {
    if (connectedUrl) {
      const entry = canvas.dataServers.find(s => s.url === connectedUrl);
      connectedUrl = '';
      if (entry) canvas.removeDataServer(entry.name);
    }
  },

  /** Initialize Gemma if needed */
  initGemma() {
    agentLoop.initGemmaIfNeeded();
  },

  /** Unload Gemma */
  unloadGemma,

  /** Run the agent to generate blocks for the showcase */
  async generate() {
    if (generating || !connectedUrl) return;

    blockCounter = 0;
    generatedBlocks = [];
    conversationHistory = [];
    toolCallCount = 0;
    lastToolName = '';
    elapsed = 0;
    agentStatus = 'Starting agent...';
    generating = true;
    canvas.setGenerating(true);

    const timerInterval = setInterval(() => elapsed++, 1000);
    abortController = new AbortController();

    // Build tool layers
    const layers: ToolLayer[] = [];

    if (canvas.mcpConnected) {
      for (const server of getMultiClient().listServers()) {
        const mcpLayer: McpLayer = {
          protocol: 'mcp',
          serverName: server.name,
          tools: fromMcpTools(server.tools as Parameters<typeof fromMcpTools>[0]),
        };
        layers.push(mcpLayer);
      }
    }

    layers.push(autoui.layer());

    // Gemma (WasmProvider) expects native `<|tool_call>…<tool_call|>` syntax in the prompt.
    const providerKind = canvas.llm.startsWith('gemma') ? 'gemma' : 'generic';
    const systemPrompt = buildSystemPrompt(layers, { providerKind });
    const discoveryCache = buildDiscoveryCache(layers);

    try {
      const result = await runAgentLoop(
        `Explore the MCP server "${canvas.mcpName}" and create a demo page with at least 6 varied UI components using real data. Use stat, chart, data-table, list, kv, timeline, cards, etc.`,
        {
          client: getMultiClient() as Parameters<typeof runAgentLoop>[1]['client'],
          provider: agentLoop.getProvider(),
          systemPrompt,
          maxIterations: 15,
          maxTokens: 4096,
          ...agentLoop.runOptions(),
          signal: abortController!.signal,
          layers,
          discoveryCache,
          contextRAG: contextRAG ?? undefined,
          schemaOptions: { sanitize: agentLoop.schemaSanitize, flatten: agentLoop.schemaFlatten, strict: false },
          callbacks: {
            onLLMResponse: (response, latencyMs) => {
              agentLoop.recordTokens(response, latencyMs);
            },
            onWidget: (type, data) => {
              const block: GeneratedBlock = {
                id: uid(),
                type,
                label: (data as Record<string, unknown>).title as string || type,
                data: data as Record<string, unknown>,
              };
              generatedBlocks = [...generatedBlocks, block];
            },
            onClear: () => { generatedBlocks = []; },
            onToolCall: (call) => {
              toolCallCount++;
              lastToolName = call.name;
              agentStatus = `Tool: ${call.name}`;
            },
            onText: (text) => {
              if (text) agentStatus = text.slice(0, 80) + (text.length > 80 ? '...' : '');
            },
          },
        }
      );
      conversationHistory = result.messages;
      agentStatus = `Done - ${generatedBlocks.length} blocks generated`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      agentStatus = `Error: ${msg}`;
    } finally {
      clearInterval(timerInterval);
      abortController = null;
      generating = false;
      canvas.setGenerating(false);
    }
  },

  /** Stop generation */
  stop() {
    abortController?.abort();
  },

  /** Clear generated blocks */
  clearBlocks() {
    generatedBlocks = [];
    agentStatus = '';
  },
};
