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
  RemoteLLMProvider,
  HawkProvider,
  WasmProvider,
  runAgentLoop,
  buildSystemPrompt,
  fromMcpTools,
  TokenTracker,
  buildDiscoveryCache,
  ContextRAG,
} from '@webmcp-auto-ui/agent';
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

// Gemma state
let gemmaProvider = $state<WasmProvider | null>(null);
let gemmaStatus = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
let gemmaProgress = $state(0);
let gemmaElapsed = $state(0);
let gemmaLoadedMB = $state(0);
let gemmaTotalMB = $state(0);
let gemmaTimerInterval = $state<ReturnType<typeof setInterval> | null>(null);
let gemmaLoadStart = $state(0);

// LLM optimization options (smart defaults via $effect below)
let schemaSanitize = $state(true);
let schemaFlatten = $state(false);
let maxResultLength = $state(10000);
let truncateResults = $state(false);
let compressHistory = $state(false);
let compressPreview = $state(500);
let cacheEnabled = $state(true);
let temperature = $state(1.0);

// Smart defaults: called imperatively when LLM changes (not $effect — module-level)
function applySmartDefaults() {
  const isGemma = canvas.llm.startsWith('gemma');
  const isLocal = canvas.llm === 'local';
  schemaSanitize = isLocal ? true : !isGemma;
  schemaFlatten = isGemma || isLocal;
  truncateResults = isGemma || isLocal;
  compressHistory = isLocal;
  if (isGemma) {
    maxResultLength = 2000;
    temperature = 0.7;
    cacheEnabled = false;
  } else if (isLocal) {
    maxResultLength = 3000;
  } else {
    // Claude defaults
    maxResultLength = 10000;
    temperature = 1.0;
    cacheEnabled = true;
  }
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

// Token tracking
const tokenTracker = new TokenTracker();
let tokenMetrics = $state(tokenTracker.metrics);
tokenTracker.subscribe(m => { tokenMetrics = m; });

// Provider singleton
const anthropicProvider = new RemoteLLMProvider({ proxyUrl: `${base}/api/chat` });
let hawkProvider: HawkProvider | null = null;

// ── Helpers ────────────────────────────────────────────────────────────────
let blockCounter = 0;
function uid() {
  return 'b' + (++blockCounter) + '_' + Date.now().toString(36);
}

function getProvider() {
  const llm = canvas.llm;
  if (llm.startsWith('hawk-')) {
    const model = llm.slice(5);
    if (!hawkProvider || hawkProvider.model !== model) {
      hawkProvider = new HawkProvider({ proxyUrl: `${base}/api/hawk`, model });
    }
    return hawkProvider;
  }
  if (llm === 'gemma-e2b' || llm === 'gemma-e4b') {
    if (gemmaProvider && gemmaProvider.model !== llm) {
      unloadGemma();
    }
    if (!gemmaProvider) {
      gemmaProvider = new WasmProvider({
        model: llm,
        contextSize: 32_768,
        onProgress: (p, _s, loaded, total) => {
          gemmaProgress = p * 100;
          if (loaded) gemmaLoadedMB = Math.round(loaded / 1048576 * 100) / 100;
          if (total) gemmaTotalMB = Math.round(total / 1048576 * 100) / 100;
        },
        onStatusChange: (s) => {
          gemmaStatus = s;
          if (s === 'loading') {
            gemmaLoadStart = Date.now();
            gemmaElapsed = 0;
            if (gemmaTimerInterval) clearInterval(gemmaTimerInterval);
            gemmaTimerInterval = setInterval(() => {
              gemmaElapsed = Math.floor((Date.now() - gemmaLoadStart) / 1000);
            }, 1000);
          }
          if (s === 'ready' || s === 'error') {
            if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
          }
        },
      });
    }
    return gemmaProvider;
  }
  anthropicProvider.setModel(llm as Parameters<typeof anthropicProvider.setModel>[0]);
  return anthropicProvider;
}

function unloadGemma() {
  (gemmaProvider as unknown as { destroy?: () => void })?.destroy?.();
  gemmaProvider = null;
  gemmaStatus = 'idle';
  gemmaProgress = 0;
  if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
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
  get tokenMetrics() { return tokenMetrics; },
  get gemmaStatus() { return gemmaStatus; },
  get gemmaProgress() { return gemmaProgress; },
  get gemmaElapsed() { return gemmaElapsed; },
  get gemmaLoadedMB() { return gemmaLoadedMB; },
  get gemmaTotalMB() { return gemmaTotalMB; },
  get multiClient() { return getMultiClient(); },
  get contextRAGEnabled() { return contextRAGEnabled; },
  set contextRAGEnabled(v: boolean) { setContextRAGEnabled(v); },

  /** Apply smart defaults for the current LLM */
  applySmartDefaults,
  get schemaSanitize() { return schemaSanitize; },
  set schemaSanitize(v: boolean) { schemaSanitize = v; },
  get schemaFlatten() { return schemaFlatten; },
  set schemaFlatten(v: boolean) { schemaFlatten = v; },
  get maxResultLength() { return maxResultLength; },
  set maxResultLength(v: number) { maxResultLength = v; },
  get truncateResults() { return truncateResults; },
  set truncateResults(v: boolean) { truncateResults = v; },
  get compressHistory() { return compressHistory; },
  set compressHistory(v: boolean) { compressHistory = v; },
  get compressPreview() { return compressPreview; },
  set compressPreview(v: number) { compressPreview = v; },

  /** Connect to an MCP server */
  async connect(url: string) {
    if (!url.trim() || connecting) return;
    // Disconnect previous if any
    if (connectedUrl) {
      await this.disconnect();
    }
    connecting = true;
    connectError = '';
    const provisionalName = canvas.addMcpServer(url.trim());
    canvas.setDataServerEnabled(provisionalName, false);
    canvas.setDataServerMeta(provisionalName, { connecting: true, error: undefined });
    try {
      const { tools } = await getMultiClient().addServer(url.trim());
      connectedUrl = url;
      canvas.setDataServerMeta(provisionalName, {
        connected: true, connecting: false,
        tools: tools as any,
        error: undefined,
      });
    } catch (e) {
      connectError = e instanceof Error ? e.message : String(e);
      canvas.setDataServerMeta(provisionalName, {
        connected: false, connecting: false,
        error: connectError,
      });
    } finally {
      connecting = false;
    }
  },

  /** Disconnect from MCP server */
  async disconnect() {
    if (connectedUrl) {
      const entry = canvas.dataServers.find(s => s.url === connectedUrl);
      await getMultiClient().removeServer(connectedUrl);
      connectedUrl = '';
      if (entry) canvas.removeDataServer(entry.name);
    }
  },

  /** Initialize Gemma if needed */
  initGemma() {
    const llm = canvas.llm;
    if ((llm === 'gemma-e2b' || llm === 'gemma-e4b') && gemmaStatus === 'idle') {
      const p = getProvider();
      if (p instanceof WasmProvider) p.initialize();
    }
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
          provider: getProvider(),
          systemPrompt,
          maxIterations: 15,
          maxTokens: 4096,
          maxResultLength,
          truncateResults,
          compressHistory: compressHistory ? compressPreview : false,
          temperature,
          cacheEnabled,
          signal: abortController!.signal,
          layers,
          discoveryCache,
          contextRAG: contextRAG ?? undefined,
          schemaOptions: { sanitize: schemaSanitize, flatten: schemaFlatten, strict: false },
          callbacks: {
            onLLMResponse: (response, latencyMs) => {
              if (response.usage) {
                tokenTracker.record(response.usage, latencyMs);
              } else if (response.stats) {
                tokenTracker.recordEstimate(0, response.stats.totalTokens * 4, latencyMs);
              }
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
