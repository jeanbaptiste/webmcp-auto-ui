/**
 * useAgentLoop — shared composable for agent loop setup.
 *
 * Centralises the duplicated provider selection, Gemma WASM lifecycle,
 * HawkProvider routing, smart LLM defaults, and TokenTracker wiring that
 * was copy-pasted across template, recipes, boilerplate, and showcase.
 *
 * Usage (Svelte 5, .svelte.ts files or <script lang="ts"> blocks):
 *
 *   const agent = createAgentLoop({
 *     chatApiBase: `${base}/api/chat`,
 *     hawkApiBase: `${base}/api/hawk`,      // optional
 *     enabledProviders: ['remote', 'wasm'],  // optional, defaults to all
 *   });
 *
 *   // Read reactive state
 *   agent.gemmaStatus   // 'idle' | 'loading' | 'ready' | 'error'
 *   agent.gemmaProgress // 0–100
 *   agent.tokenMetrics  // { inputTokens, outputTokens, … }
 *
 *   // Use inside runAgentLoop
 *   const result = await runAgentLoop(msg, {
 *     provider: agent.getProvider(),
 *     ...agent.runOptions(),
 *     callbacks: { ... },
 *   });
 */

import { canvas } from '@webmcp-auto-ui/sdk/canvas';
import {
  RemoteLLMProvider,
  WasmProvider,
  HawkProvider,
  LocalLLMProvider,
  TokenTracker,
} from '@webmcp-auto-ui/agent';
import type { LLMProvider } from '@webmcp-auto-ui/agent';

// ── Types ──────────────────────────────────────────────────────────────────

export type GemmaStatus = 'idle' | 'loading' | 'ready' | 'error';

export type EnabledProvider = 'remote' | 'wasm' | 'hawk' | 'local';

export interface UseAgentLoopOptions {
  /** Base URL for the remote (Claude) proxy, e.g. `${base}/api/chat` */
  chatApiBase: string;
  /** Base URL for the Hawk proxy, e.g. `${base}/api/hawk` (optional) */
  hawkApiBase?: string;
  /** Restrict which providers can be selected. Defaults to all. */
  enabledProviders?: EnabledProvider[];
  /** Ollama base URL (only used when 'local' provider is enabled) */
  localUrl?: string;
  /** Ollama model name override */
  localModel?: string;
  /** Gemma contextSize for WasmProvider (default 32768) */
  gemmaContextSize?: number;
}

export interface AgentRunOptions {
  /** Schema sanitize option (smart default from LLM) */
  schemaSanitize: boolean;
  /** Schema flatten option (smart default from LLM) */
  schemaFlatten: boolean;
  /** Max tool result length */
  maxResultLength: number;
  /** Whether to truncate tool results */
  truncateResults: boolean;
  /** Compress history length (false = disabled) */
  compressHistory: false | number;
  /** Whether prompt caching is enabled */
  cacheEnabled: boolean;
  /** LLM temperature */
  temperature: number;
}

// ── Factory ────────────────────────────────────────────────────────────────

export function createAgentLoop(options: UseAgentLoopOptions) {
  const {
    chatApiBase,
    hawkApiBase,
    enabledProviders,
    localUrl = 'http://localhost:11434',
    localModel = 'llama3.2',
    gemmaContextSize = 32_768,
  } = options;

  const canUse = (p: EnabledProvider) =>
    !enabledProviders || enabledProviders.includes(p);

  // ── Provider singletons ──────────────────────────────────────────────────
  const remoteProvider = new RemoteLLMProvider({ proxyUrl: chatApiBase });
  let hawkProvider: HawkProvider | null = null;

  // ── Gemma state ──────────────────────────────────────────────────────────
  let gemmaProvider = $state<WasmProvider | null>(null);
  let gemmaStatus = $state<GemmaStatus>('idle');
  let gemmaProgress = $state(0);
  let gemmaElapsed = $state(0);
  let gemmaLoadedMB = $state(0);
  let gemmaTotalMB = $state(0);
  let gemmaLoadStart = 0;
  let gemmaTimerInterval: ReturnType<typeof setInterval> | null = null;

  // ── Smart defaults state ─────────────────────────────────────────────────
  let schemaSanitize = $state(true);
  let schemaFlatten = $state(false);
  let maxResultLength = $state(10_000);
  let truncateResults = $state(false);
  let compressHistoryEnabled = $state(false);
  let compressPreview = $state(500);
  let cacheEnabled = $state(true);
  let temperature = $state(1.0);

  // ── TokenTracker ─────────────────────────────────────────────────────────
  const tokenTracker = new TokenTracker();
  let tokenMetrics = $state(tokenTracker.metrics);
  tokenTracker.subscribe((m) => { tokenMetrics = m; });

  // ── Internal helpers ─────────────────────────────────────────────────────
  function _startGemmaTimer() {
    gemmaLoadStart = Date.now();
    gemmaElapsed = 0;
    if (gemmaTimerInterval) clearInterval(gemmaTimerInterval);
    gemmaTimerInterval = setInterval(() => {
      gemmaElapsed = Math.floor((Date.now() - gemmaLoadStart) / 1000);
    }, 1000);
  }

  function _stopGemmaTimer() {
    if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
  }

  function _makeWasmProvider(model: string): WasmProvider {
    return new WasmProvider({
      // WasmProviderOptions.model is typed as WasmModelId; cast via unknown for safety
      model: model as any,
      contextSize: gemmaContextSize,
      onProgress: (p, _s, loaded, total) => {
        gemmaProgress = p * 100;
        if (loaded) gemmaLoadedMB = Math.round(loaded / 1048576 * 100) / 100;
        if (total) gemmaTotalMB = Math.round(total / 1048576 * 100) / 100;
      },
      onStatusChange: (s: GemmaStatus) => {
        gemmaStatus = s;
        if (s === 'loading') _startGemmaTimer();
        if (s === 'ready' || s === 'error') _stopGemmaTimer();
      },
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────

  return {
    // Gemma reactive state
    get gemmaProvider() { return gemmaProvider; },
    get gemmaStatus() { return gemmaStatus; },
    get gemmaProgress() { return gemmaProgress; },
    get gemmaElapsed() { return gemmaElapsed; },
    get gemmaLoadedMB() { return gemmaLoadedMB; },
    get gemmaTotalMB() { return gemmaTotalMB; },

    // TokenTracker
    get tokenTracker() { return tokenTracker; },
    get tokenMetrics() { return tokenMetrics; },

    // Smart defaults (read/write)
    get schemaSanitize() { return schemaSanitize; },
    set schemaSanitize(v: boolean) { schemaSanitize = v; },
    get schemaFlatten() { return schemaFlatten; },
    set schemaFlatten(v: boolean) { schemaFlatten = v; },
    get maxResultLength() { return maxResultLength; },
    set maxResultLength(v: number) { maxResultLength = v; },
    get truncateResults() { return truncateResults; },
    set truncateResults(v: boolean) { truncateResults = v; },
    get compressHistoryEnabled() { return compressHistoryEnabled; },
    set compressHistoryEnabled(v: boolean) { compressHistoryEnabled = v; },
    get compressPreview() { return compressPreview; },
    set compressPreview(v: number) { compressPreview = v; },
    get cacheEnabled() { return cacheEnabled; },
    set cacheEnabled(v: boolean) { cacheEnabled = v; },
    get temperature() { return temperature; },
    set temperature(v: number) { temperature = v; },

    /**
     * Apply smart defaults for the current `canvas.llm` value.
     * Call this imperatively when the LLM changes (e.g. in a `$effect`).
     */
    applySmartDefaults() {
      const llm = canvas.llm;
      const isGemma = llm.startsWith('gemma');
      const isLocal = llm === 'local';
      schemaSanitize = isLocal ? true : !isGemma;
      schemaFlatten = isGemma || isLocal;
      truncateResults = isGemma || isLocal;
      compressHistoryEnabled = isLocal;
      if (isGemma) {
        maxResultLength = 2_000;
        temperature = 0.7;
        cacheEnabled = false;
      } else if (isLocal) {
        maxResultLength = 3_000;
      } else {
        maxResultLength = 10_000;
        temperature = 1.0;
        cacheEnabled = true;
      }
    },

    /**
     * Resolve the LLM provider for the current `canvas.llm`.
     * Manages WasmProvider singleton lifecycle (create / swap model).
     */
    getProvider(): LLMProvider {
      const llm = canvas.llm;

      // Hawk (server-side proxy)
      if (canUse('hawk') && llm.startsWith('hawk-')) {
        const model = llm.slice(5);
        if (!hawkProvider || hawkProvider.model !== model) {
          hawkProvider = new HawkProvider({ proxyUrl: hawkApiBase ?? `${chatApiBase}/hawk`, model });
        }
        return hawkProvider;
      }

      // Local Ollama
      if (canUse('local') && llm === 'local') {
        return new LocalLLMProvider({ baseUrl: localUrl, model: localModel });
      }

      // Gemma WASM
      if (canUse('wasm') && (llm === 'gemma-e2b' || llm === 'gemma-e4b')) {
        if (gemmaProvider && gemmaProvider.model !== llm) {
          this.unloadGemma();
        }
        if (!gemmaProvider) {
          gemmaProvider = _makeWasmProvider(llm);
        }
        return gemmaProvider;
      }

      // Remote Claude (default)
      remoteProvider.setModel(llm as Parameters<typeof remoteProvider.setModel>[0]);
      return remoteProvider;
    },

    /**
     * Initialize Gemma if `canvas.llm` is a Gemma model and status is idle.
     * Idempotent — safe to call on every LLM change.
     */
    initGemmaIfNeeded() {
      const llm = canvas.llm;
      if ((llm === 'gemma-e2b' || llm === 'gemma-e4b') && gemmaStatus === 'idle') {
        const p = this.getProvider();
        if (p instanceof WasmProvider) p.initialize();
      }
    },

    /** Destroy and reset the current WasmProvider instance. */
    unloadGemma() {
      (gemmaProvider as unknown as { destroy?: () => void })?.destroy?.();
      gemmaProvider = null;
      gemmaStatus = 'idle';
      gemmaProgress = 0;
      _stopGemmaTimer();
    },

    /**
     * Return the agent loop options derived from current smart defaults.
     * Spread into `runAgentLoop` options alongside app-specific overrides.
     */
    runOptions(): AgentRunOptions {
      return {
        schemaSanitize,
        schemaFlatten,
        maxResultLength,
        truncateResults,
        compressHistory: compressHistoryEnabled ? compressPreview : false,
        cacheEnabled,
        temperature,
      };
    },

    /** Record an LLM response into the TokenTracker (use in onLLMResponse callback). */
    recordTokens(response: { usage?: Record<string, number>; stats?: { totalTokens: number } }, latencyMs: number) {
      if (response.usage) {
        tokenTracker.record(response.usage as any, latencyMs);
      } else if (response.stats) {
        tokenTracker.recordEstimate(0, response.stats.totalTokens * 4, latencyMs);
      }
    },

    /** Clean up intervals on component destroy. */
    destroy() {
      _stopGemmaTimer();
    },
  };
}

export type AgentLoop = ReturnType<typeof createAgentLoop>;
