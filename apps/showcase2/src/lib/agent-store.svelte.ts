/**
 * Reactive agent store for showcase2.
 * Manages MCP connection, LLM provider selection, and agent loop execution.
 * Generated blocks are stored here for the page to render.
 */
import { canvas } from '@webmcp-auto-ui/sdk/canvas';
import { McpMultiClient } from '@webmcp-auto-ui/core';
import {
  RemoteLLMProvider,
  WasmProvider,
  runAgentLoop,
  buildSystemPrompt,
  fromMcpTools,
  TokenTracker,
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
let multiClient = $state(new McpMultiClient());
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

// Token tracking
const tokenTracker = new TokenTracker();
let tokenMetrics = $state(tokenTracker.metrics);
tokenTracker.subscribe(m => { tokenMetrics = m; });

// Provider singleton
const anthropicProvider = new RemoteLLMProvider({ proxyUrl: `${base}/api/chat` });

// ── Helpers ────────────────────────────────────────────────────────────────
let blockCounter = 0;
function uid() {
  return 'b' + (++blockCounter) + '_' + Date.now().toString(36);
}

function getProvider() {
  const llm = canvas.llm;
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
  get multiClient() { return multiClient; },

  /** Connect to an MCP server */
  async connect(url: string) {
    if (!url.trim() || connecting) return;
    // Disconnect previous if any
    if (connectedUrl) {
      await this.disconnect();
    }
    connecting = true;
    connectError = '';
    canvas.setMcpConnecting(true);
    try {
      const { name, tools } = await multiClient.addServer(url.trim());
      connectedUrl = url;
      canvas.setMcpConnected(true, name, tools as Parameters<typeof canvas.setMcpConnected>[2]);
    } catch (e) {
      connectError = e instanceof Error ? e.message : String(e);
      canvas.setMcpError(connectError);
    } finally {
      connecting = false;
      canvas.setMcpConnecting(false);
    }
  },

  /** Disconnect from MCP server */
  async disconnect() {
    if (connectedUrl) {
      await multiClient.removeServer(connectedUrl);
      connectedUrl = '';
      canvas.setMcpConnected(false, '', []);
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
      for (const server of multiClient.listServers()) {
        const mcpLayer: McpLayer = {
          protocol: 'mcp',
          serverName: server.name,
          tools: fromMcpTools(server.tools as Parameters<typeof fromMcpTools>[0]),
        };
        layers.push(mcpLayer);
      }
    }

    layers.push(autoui.layer());

    const systemPrompt = buildSystemPrompt(layers);

    try {
      const result = await runAgentLoop(
        `Explore le serveur MCP "${canvas.mcpName}" et crée une page de démonstration avec au moins 6 composants UI variés utilisant les vraies données. Utilise des stat, chart, data-table, list, kv, timeline, cards etc.`,
        {
          client: multiClient as Parameters<typeof runAgentLoop>[1]['client'],
          provider: getProvider(),
          systemPrompt,
          maxIterations: 15,
          maxTokens: 4096,
          cacheEnabled: true,
          signal: abortController!.signal,
          layers,
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
