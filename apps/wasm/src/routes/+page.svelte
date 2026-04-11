<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { base } from '$app/paths';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { McpMultiClient } from '@webmcp-auto-ui/core';
  import {
    AnthropicProvider, GemmaProvider, runAgentLoop, buildSystemPrompt,
    fromMcpTools, buildToolsFromLayers, trimConversationHistory,
  } from '@webmcp-auto-ui/agent';
  import type { ChatMessage, ToolLayer, McpLayer, AnthropicTool } from '@webmcp-auto-ui/agent';
  import { autoui } from '@webmcp-auto-ui/agent';
  import { McpStatus, GemmaLoader, WidgetRenderer } from '@webmcp-auto-ui/ui';

  // ── Types ──────────────────────────────────────────────────────────────────
  type ModelId = 'gemma-e2b' | 'gemma-e4b' | 'claude-haiku-4-5' | 'claude-sonnet-4-6';
  type LogTab = 'prompt' | 'tools' | 'recipes' | 'raw' | 'diff';

  interface RunResult {
    blocks: { type: string; data: Record<string, unknown> }[];
    text: string;
    raw: string;
    toolCalls: { name: string; args: Record<string, unknown> }[];
    prompt: string;
    tools: AnthropicTool[];
    recipes: { name: string; description?: string }[];
    elapsed: number;
    tokensPerSec: number;
    messages: ChatMessage[];
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let model = $state<ModelId>('gemma-e2b');
  let mcpUrl = $state('https://mcp.code4code.eu/mcp');
  let promptText = $state('Montre-moi les 5 derniers dossiers legislatifs');
  let running = $state(false);

  let mcpConnected = $state(false);
  let mcpName = $state('');
  let mcpConnecting = $state(false);
  let mcpRecipes = $state<{ name: string; description?: string }[]>([]);

  let results = $state<RunResult[]>([]);
  let activeTab = $state<LogTab>('prompt');
  let logHeight = $state(250);

  // Gemma state
  let gemmaProvider = $state<GemmaProvider | null>(null);
  let gemmaStatus = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  let gemmaProgress = $state(0);
  let gemmaElapsed = $state(0);
  let gemmaLoadStart = $state(0);
  let gemmaLoadedMB = $state(0);
  let gemmaTotalMB = $state(0);
  let gemmaTimerInterval = $state<ReturnType<typeof setInterval> | null>(null);

  // Multi-MCP
  let multiClient = $state<McpMultiClient>(new McpMultiClient());

  // Theme state
  let isDark = $state(true);

  // Anthropic provider singleton
  const anthropicProvider = new AnthropicProvider({ proxyUrl: `${base}/api/chat` });

  // ── Resize logic ───────────────────────────────────────────────────────────
  let resizing = $state(false);
  let resizeStartY = $state(0);
  let resizeStartH = $state(0);

  function onResizeStart(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    resizing = true;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    resizeStartY = clientY;
    resizeStartH = logHeight;
    if ('touches' in e) {
      window.addEventListener('touchmove', onResizeMove, { passive: false });
      window.addEventListener('touchend', onResizeEnd);
    } else {
      window.addEventListener('mousemove', onResizeMove);
      window.addEventListener('mouseup', onResizeEnd);
    }
  }

  function onResizeMove(e: MouseEvent | TouchEvent) {
    if (!resizing) return;
    if ('touches' in e) e.preventDefault();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const delta = resizeStartY - clientY;
    const maxH = Math.round(window.innerHeight * 0.7);
    logHeight = Math.max(100, Math.min(maxH, resizeStartH + delta));
  }

  function onResizeEnd() {
    resizing = false;
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);
    window.removeEventListener('touchmove', onResizeMove);
    window.removeEventListener('touchend', onResizeEnd);
  }

  // ── Provider ───────────────────────────────────────────────────────────────
  function getProvider(modelId: ModelId) {
    if (modelId === 'gemma-e2b' || modelId === 'gemma-e4b') {
      if (gemmaProvider && gemmaProvider.model !== modelId) {
        unloadGemma();
      }
      if (!gemmaProvider) {
        gemmaProvider = new GemmaProvider({
          model: modelId,
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
    anthropicProvider.setModel(modelId as any);
    return anthropicProvider;
  }

  function unloadGemma() {
    (gemmaProvider as unknown as { destroy?: () => void })?.destroy?.();
    gemmaProvider = null;
    gemmaStatus = 'idle';
    gemmaProgress = 0;
    if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
  }

  // Auto-init Gemma when a gemma model is selected
  $effect(() => {
    const m = model;
    untrack(() => {
      if ((m === 'gemma-e2b' || m === 'gemma-e4b') && gemmaStatus === 'idle') {
        const p = getProvider(m);
        if (p instanceof GemmaProvider) p.initialize();
      }
    });
  });

  // ── MCP ────────────────────────────────────────────────────────────────────
  async function connectMcp() {
    if (!mcpUrl.trim() || mcpConnected) return;
    mcpConnecting = true;
    try {
      const { name, tools } = await multiClient.addServer(mcpUrl.trim());
      mcpConnected = true;
      mcpName = name;
      const allTools = multiClient.listAllTools();
      canvas.setMcpConnected(true, name, allTools as Parameters<typeof canvas.setMcpConnected>[2]);

      if (tools.some(t => t.name === 'list_recipes')) {
        try {
          const r = await multiClient.callTool('list_recipes', {});
          const text = r.content?.find((c: any) => c.type === 'text') as any;
          if (text?.text) {
            const parsed = JSON.parse(text.text);
            mcpRecipes = Array.isArray(parsed) ? parsed : (parsed?.recipes ?? []);
          }
        } catch { /* no recipes */ }
      }
    } catch (e) {
      canvas.setMcpError(e instanceof Error ? e.message : String(e));
    } finally {
      mcpConnecting = false;
    }
  }

  // ── Layers ─────────────────────────────────────────────────────────────────
  function buildLayers(): ToolLayer[] {
    const result: ToolLayer[] = [];
    if (mcpConnected) {
      const mcpLayer: McpLayer = {
        protocol: 'mcp',
        serverName: mcpName || 'mcp',
        tools: fromMcpTools(canvas.mcpTools as Parameters<typeof fromMcpTools>[0]),
        recipes: mcpRecipes.length > 0 ? mcpRecipes : undefined,
      };
      result.push(mcpLayer);
    }
    result.push(autoui.layer());
    return result;
  }

  // ── Bench run ──────────────────────────────────────────────────────────────
  async function runBench() {
    if (running || !promptText.trim()) return;
    running = true;
    results = [];

    const layers = buildLayers();
    const provider = getProvider(model);

    try {
      const result = await runSingleMode(layers, provider);
      results = [result];
    } catch (e) {
      results = [{
        blocks: [],
        text: `Error: ${e instanceof Error ? e.message : String(e)}`,
        raw: '',
        toolCalls: [],
        prompt: '',
        tools: [],
        recipes: [],
        elapsed: 0,
        tokensPerSec: 0,
        messages: [],
      }];
    } finally {
      running = false;
    }
  }

  async function runSingleMode(
    layers: ToolLayer[],
    provider: ReturnType<typeof getProvider>,
  ): Promise<RunResult> {
    const tools = buildToolsFromLayers(layers);
    const prompt = buildSystemPrompt(layers);
    const recipes = collectRecipes(layers);

    const blocks: { type: string; data: Record<string, unknown> }[] = [];
    let rawText = '';
    const toolCalls: { name: string; args: Record<string, unknown> }[] = [];
    const start = performance.now();

    const result = await runAgentLoop(promptText, {
      client: multiClient.hasConnections ? multiClient as any : undefined,
      provider,
      systemPrompt: prompt,
      maxIterations: 15,
      maxTokens: 4096,
      layers,
      callbacks: {
        onWidget: (type, data) => {
          blocks.push({ type, data: data as Record<string, unknown> });
        },
        onText: (text) => {
          if (text) rawText = text;
        },
        onToolCall: (call) => {
          toolCalls.push({ name: call.name, args: call.args as Record<string, unknown> });
        },
      },
    });

    const elapsed = Math.round(performance.now() - start);
    const outputTokens = result.metrics?.completionTokens ?? 0;
    const tokensPerSec = elapsed > 0 && outputTokens > 0
      ? Math.round((outputTokens / (elapsed / 1000)) * 10) / 10
      : 0;

    return {
      blocks,
      text: result.text,
      raw: rawText || result.text,
      toolCalls,
      prompt,
      tools,
      recipes,
      elapsed,
      tokensPerSec,
      messages: result.messages,
    };
  }

  function collectRecipes(layers: ToolLayer[]): { name: string; description?: string }[] {
    const recipes: { name: string; description?: string }[] = [];
    for (const layer of layers) {
      if (layer.recipes) {
        for (const r of layer.recipes) {
          recipes.push({ name: r.name, description: 'description' in r ? (r as any).description : undefined });
        }
      }
    }
    return recipes;
  }

  // ── Theme toggle ───────────────────────────────────────────────────────────
  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    isDark = next === 'dark';
    try { localStorage.setItem('webmcp-theme', next); } catch {}
    import('@webmcp-auto-ui/ui').then(({ THEME_MAP }) => {
      const tokens = THEME_MAP[next as 'light' | 'dark'];
      if (tokens) for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--${k}`, v);
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const MODELS: { id: ModelId; label: string }[] = [
    { id: 'gemma-e2b', label: 'Gemma E2B' },
    { id: 'gemma-e4b', label: 'Gemma E4B' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  ];

  function formatJson(obj: unknown): string {
    try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
  }
</script>

<svelte:head><title>Auto-UI wasm bench</title></svelte:head>

<div class="h-screen flex flex-col overflow-hidden bg-bg">

  <!-- HEADER -->
  <header class="h-12 flex items-center gap-3 px-4 border-b border-border bg-surface flex-shrink-0">
    <span class="font-mono text-sm font-bold flex-shrink-0">
      <span class="text-text1">Auto-UI</span> <span class="text-accent">wasm</span>
    </span>

    <select
      bind:value={model}
      class="h-7 px-2 rounded border border-border2 bg-surface2 text-text1 font-mono text-xs outline-none"
    >
      {#each MODELS as m}
        <option value={m.id}>{m.label}</option>
      {/each}
    </select>

    <div class="flex-1"></div>

    <McpStatus
      connecting={mcpConnecting}
      connected={mcpConnected}
      name={mcpName || 'non connecte'}
      servers={mcpConnected ? [{ url: mcpUrl, name: mcpName, toolCount: multiClient.listAllTools().length }] : []}
    />

    {#if gemmaStatus === 'ready'}
      <span class="font-mono text-[10px] text-teal flex items-center gap-1 flex-shrink-0">
        <span class="w-1.5 h-1.5 rounded-full bg-teal"></span>
        {model === 'gemma-e2b' ? 'Gemma E2B' : model === 'gemma-e4b' ? 'Gemma E4B' : model}
      </span>
    {/if}

    <button
      class="font-mono text-xs h-7 px-2 rounded border border-border2 text-text2 hover:text-text1 transition-all flex-shrink-0"
      onclick={toggleTheme}
      aria-label="Toggle theme"
    >
      {isDark ? '\u263D' : '\u2600'}
    </button>
  </header>

  <!-- GEMMA LOADER -->
  {#if gemmaStatus === 'loading' || gemmaStatus === 'error'}
    <GemmaLoader
      status={gemmaStatus}
      progress={gemmaProgress}
      elapsed={gemmaElapsed}
      loadedMB={gemmaLoadedMB}
      totalMB={gemmaTotalMB}
      modelName={model === 'gemma-e2b' ? 'Gemma E2B' : model === 'gemma-e4b' ? 'Gemma E4B' : model}
      onunload={unloadGemma}
    />
  {/if}

  <!-- CONFIG BAR -->
  <div class="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface flex-shrink-0 flex-wrap">
    <input
      type="text"
      bind:value={mcpUrl}
      placeholder="MCP URL"
      class="h-7 px-2 rounded border border-border2 bg-surface2 text-text1 font-mono text-xs outline-none flex-shrink-0 w-64"
    />
    <button
      onclick={connectMcp}
      disabled={mcpConnecting || mcpConnected}
      class="h-7 px-3 rounded border font-mono text-xs transition-colors flex-shrink-0
             {mcpConnected ? 'border-teal/30 bg-teal/10 text-teal' : 'border-accent/30 bg-accent/10 text-accent hover:bg-accent/20'}
             disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {mcpConnected ? 'Connecte' : mcpConnecting ? 'Connexion...' : 'Connecter'}
    </button>

    <div class="w-px h-5 bg-border2 mx-1"></div>

    <input
      type="text"
      bind:value={promptText}
      placeholder="Prompt..."
      class="h-7 px-2 rounded border border-border2 bg-surface2 text-text1 font-mono text-xs outline-none flex-1 min-w-48"
    />

    <button
      onclick={runBench}
      disabled={running || !promptText.trim()}
      class="h-7 px-4 rounded border border-accent bg-accent text-white font-mono text-xs hover:bg-accent/90 transition-colors flex-shrink-0
             disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {running ? 'En cours...' : 'Lancer'}
    </button>
  </div>

  <!-- MAIN AREA -->
  <div class="flex-1 overflow-hidden flex">
    <!-- Results columns -->
    <div class="flex-1 overflow-auto p-4 flex gap-4">
      {#if results.length === 0 && !running}
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center text-text2 font-mono text-sm">
            <p class="text-lg mb-2">Bench WASM</p>
            <p class="text-xs">Connectez un MCP, puis lancez.</p>
          </div>
        </div>
      {:else}
        {#each results as result, i}
          <div class="flex-1 min-w-0 flex flex-col gap-3">
            <!-- Metrics -->
            <div class="flex items-center gap-2">
              <span class="font-mono text-[10px] text-text2">
                {result.elapsed}ms
                {#if result.tokensPerSec > 0}
                  &middot; {result.tokensPerSec} tok/s
                {/if}
              </span>
            </div>

            <!-- Blocks -->
            {#if result.blocks.length > 0}
              <div class="flex flex-col gap-2">
                {#each result.blocks as block}
                  <div class="block-anim">
                    <WidgetRenderer type={block.type} data={block.data} />
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Text output -->
            {#if result.text}
              <div class="font-mono text-xs text-text1 bg-surface2 rounded p-3 whitespace-pre-wrap">
                {result.text}
              </div>
            {/if}
          </div>
        {/each}
      {/if}

      {#if running}
        <div class="flex-1 flex items-center justify-center">
          <div class="font-mono text-sm text-text2 animate-pulse">Execution en cours...</div>
        </div>
      {/if}
    </div>
  </div>

  <!-- RESIZE HANDLE -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="h-1.5 bg-border2 cursor-row-resize hover:bg-accent transition-colors flex-shrink-0"
    onmousedown={onResizeStart}
    ontouchstart={onResizeStart}
  ></div>

  <!-- LOG PANEL -->
  <div
    class="flex-shrink-0 bg-surface2 border-t border-border flex flex-col overflow-hidden"
    style="height: {logHeight}px"
  >
    <!-- Tabs -->
    <div class="flex items-center gap-0 border-b border-border flex-shrink-0">
      {#each ['prompt', 'tools', 'recipes', 'raw', 'diff'] as tab}
        <button
          class="h-8 px-3 font-mono text-[10px] uppercase tracking-wider transition-colors border-b-2
                 {activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-text2 hover:text-text1'}"
          onclick={() => activeTab = tab as LogTab}
        >
          {tab === 'prompt' ? 'Prompt' : tab === 'tools' ? 'Tools' : tab === 'recipes' ? 'Recettes' : tab === 'raw' ? 'Raw' : 'Diff'}
        </button>
      {/each}
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-auto p-3">
      {#if activeTab === 'prompt'}
        <div class="flex gap-4">
          {#each results as result, i}
            <div class="flex-1 min-w-0">
              <pre class="font-mono text-xs text-text1 whitespace-pre-wrap break-words">{result.prompt || '(aucun run)'}</pre>
            </div>
          {/each}
          {#if results.length === 0}
            <pre class="font-mono text-xs text-text2">Lancez un bench pour voir le system prompt.</pre>
          {/if}
        </div>
      {:else if activeTab === 'tools'}
        <div class="flex gap-4">
          {#each results as result}
            <div class="flex-1 min-w-0">
              <div class="font-mono text-[10px] text-text2 mb-1">{result.tools.length} tools</div>
              {#each result.tools.slice(0, 15) as tool}
                <details class="mb-1">
                  <summary class="font-mono text-xs text-accent cursor-pointer hover:underline">{tool.name}</summary>
                  <pre class="font-mono text-[10px] text-text2 ml-2 mt-1 whitespace-pre-wrap">{formatJson(tool.input_schema)}</pre>
                </details>
              {/each}
              {#if result.tools.length > 15}
                <div class="font-mono text-[10px] text-text2 mt-1">...et {result.tools.length - 15} de plus (cap a 15)</div>
              {/if}
            </div>
          {/each}
          {#if results.length === 0}
            <pre class="font-mono text-xs text-text2">Lancez un bench pour voir les tools.</pre>
          {/if}
        </div>
      {:else if activeTab === 'recipes'}
        <div class="flex gap-4">
          {#each results as result}
            <div class="flex-1 min-w-0">
              <div class="font-mono text-[10px] text-text2 mb-1">{result.recipes.length} recettes</div>
              {#each result.recipes as recipe}
                <div class="mb-1">
                  <span class="font-mono text-xs text-teal">{recipe.name}</span>
                  {#if recipe.description}
                    <span class="font-mono text-[10px] text-text2 ml-2">{recipe.description}</span>
                  {/if}
                </div>
              {/each}
              {#if result.recipes.length === 0}
                <pre class="font-mono text-[10px] text-text2">Aucune recette.</pre>
              {/if}
            </div>
          {/each}
          {#if results.length === 0}
            <pre class="font-mono text-xs text-text2">Lancez un bench pour voir les recettes.</pre>
          {/if}
        </div>
      {:else if activeTab === 'raw'}
        <div class="flex gap-4">
          {#each results as result}
            <div class="flex-1 min-w-0">
              <pre class="font-mono text-xs text-text1 whitespace-pre-wrap break-words">{result.raw || result.text || '(vide)'}</pre>
            </div>
          {/each}
          {#if results.length === 0}
            <pre class="font-mono text-xs text-text2">Lancez un bench pour voir la reponse brute.</pre>
          {/if}
        </div>
      {:else if activeTab === 'diff'}
        <div class="flex gap-4">
          {#if results.length >= 2}
            {#each results as result}
              <div class="flex-1 min-w-0">
                <div class="font-mono text-[10px] text-text2 mb-1">{result.toolCalls.length} tool calls</div>
                {#each result.toolCalls as call}
                  <details class="mb-1">
                    <summary class="font-mono text-xs text-accent cursor-pointer hover:underline">{call.name}</summary>
                    <pre class="font-mono text-[10px] text-text2 ml-2 mt-1 whitespace-pre-wrap">{formatJson(call.args)}</pre>
                  </details>
                {/each}
              </div>
            {/each}
          {:else if results.length === 1}
            <div class="flex-1 min-w-0">
              <div class="font-mono text-[10px] text-text2 mb-1">{results[0].toolCalls.length} tool calls</div>
              {#each results[0].toolCalls as call}
                <details class="mb-1">
                  <summary class="font-mono text-xs text-accent cursor-pointer hover:underline">{call.name}</summary>
                  <pre class="font-mono text-[10px] text-text2 ml-2 mt-1 whitespace-pre-wrap">{formatJson(call.args)}</pre>
                </details>
              {/each}
            </div>
            <div class="flex-1 flex items-center justify-center">
              <pre class="font-mono text-xs text-text2">Lancez un second mode pour comparer.</pre>
            </div>
          {:else}
            <pre class="font-mono text-xs text-text2">Lancez un bench pour voir le diff des tool calls.</pre>
          {/if}
        </div>
      {/if}
    </div>
  </div>

</div>
