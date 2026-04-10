<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { base } from '$app/paths';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { McpMultiClient } from '@webmcp-auto-ui/core';
  import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';
  import {
    AnthropicProvider, GemmaProvider, runAgentLoop, buildSystemPrompt,
    WEBMCP_RECIPES, recipeRegistry, filterRecipesByServer,
    fromMcpTools, trimConversationHistory, TokenTracker,
  } from '@webmcp-auto-ui/agent';
  import type { ChatMessage, Recipe, McpRecipe, ToolLayer, McpLayer, UILayer } from '@webmcp-auto-ui/agent';
  import { McpStatus, LLMSelector, GemmaLoader, RemoteMCPserversDemo, THEME_MAP } from '@webmcp-auto-ui/ui';
  import RecipeList from '$lib/RecipeList.svelte';
  import RecipeDetail from '$lib/RecipeDetail.svelte';
  import RecipePreview from '$lib/RecipePreview.svelte';

  // ── State ─────────────────────────────────────────────────────────────────
  let selectedId = $state<string | null>(null);
  let selectedSource = $state<'local' | 'mcp'>('local');

  // MCP
  let multiClient = $state<McpMultiClient>(new McpMultiClient());
  let connectedUrls = $state<string[]>([]);
  let loadingUrls = $state<string[]>([]);
  let mcpRecipes = $state<McpRecipe[]>([]);
  let mcpToken = $state('');

  // Agent / Preview
  let testing = $state(false);
  let previewBlocks = $state<{id: string; type: string; data: Record<string, unknown>}[]>([]);
  let previewText = $state('');
  let previewError = $state('');
  let chatTimer = $state(0);
  let chatToolCount = $state(0);
  let chatLastTool = $state('');
  let conversationHistory = $state<ChatMessage[]>([]);
  let abortController = $state<AbortController | null>(null);

  // Settings panel
  let settingsOpen = $state(false);

  // Provider
  const anthropicProvider = new AnthropicProvider({ proxyUrl: `${base}/api/chat` });
  const tokenTracker = new TokenTracker();

  // Gemma WASM state
  let gemmaProvider = $state<GemmaProvider | null>(null);
  let gemmaStatus = $state<'idle'|'loading'|'ready'|'error'>('idle');
  let gemmaProgress = $state(0);
  let gemmaElapsed = $state(0);
  let gemmaLoadStart = $state(0);
  let gemmaLoadedMB = $state(0);
  let gemmaTotalMB = $state(0);
  let gemmaTimerInterval = $state<ReturnType<typeof setInterval> | null>(null);

  function getProvider() {
    if (canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') {
      if (gemmaProvider && gemmaProvider.model !== canvas.llm) {
        unloadGemma();
      }
      if (!gemmaProvider) {
        gemmaProvider = new GemmaProvider({
          model: canvas.llm,
          contextSize: 150_000,
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
    anthropicProvider.setModel(canvas.llm as any);
    return anthropicProvider;
  }

  function unloadGemma() {
    (gemmaProvider as unknown as { destroy?: () => void })?.destroy?.();
    gemmaProvider = null;
    gemmaStatus = 'idle';
    gemmaProgress = 0;
    if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
  }

  $effect(() => {
    const llm = canvas.llm;
    untrack(() => {
      if ((llm === 'gemma-e2b' || llm === 'gemma-e4b') && gemmaStatus === 'idle') {
        const p = getProvider();
        if (p instanceof GemmaProvider) p.initialize();
      }
    });
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedRecipe = $derived.by((): Recipe | null => {
    if (!selectedId || selectedSource !== 'local') return null;
    return recipeRegistry.get(selectedId) ?? WEBMCP_RECIPES.find(r => r.id === selectedId) ?? null;
  });

  const selectedMcpRecipe = $derived.by((): McpRecipe | null => {
    if (!selectedId || selectedSource !== 'mcp') return null;
    const name = selectedId.replace(/^mcp:/, '');
    return mcpRecipes.find(r => r.name === name) ?? null;
  });

  // ── MCP ────────────────────────────────────────────────────────────────────
  async function addMcpServer(url: string) {
    if (!url.trim()) return;
    loadingUrls = [...loadingUrls, url];
    canvas.setMcpConnecting(true);
    try {
      const opts = mcpToken.trim() ? { headers: { Authorization: `Bearer ${mcpToken.trim()}` } } : undefined;
      const { tools } = await multiClient.addServer(url.trim(), opts);
      connectedUrls = [...connectedUrls, url];
      const allTools = multiClient.listAllTools();
      canvas.setMcpConnected(true, multiClient.listServers().map(s => s.name).join(', '), allTools as Parameters<typeof canvas.setMcpConnected>[2]);

      // Load recipes if server has list_recipes
      if (tools.some(t => t.name === 'list_recipes')) {
        try {
          const r = await multiClient.callTool('list_recipes', {});
          const text = r.content?.find((c: any) => c.type === 'text') as any;
          if (text?.text) {
            const parsed = JSON.parse(text.text);
            const newRecipes: McpRecipe[] = Array.isArray(parsed) ? parsed : (parsed?.recipes ?? []);
            const existing = new Set(mcpRecipes.map(r => r.name));
            mcpRecipes = [...mcpRecipes, ...newRecipes.filter(r => !existing.has(r.name))];
          }
        } catch { /* no recipes */ }
      }
    } catch (e) {
      canvas.setMcpError(e instanceof Error ? e.message : String(e));
    } finally {
      loadingUrls = loadingUrls.filter(u => u !== url);
      canvas.setMcpConnecting(false);
    }
  }

  async function removeMcpServer(url: string) {
    await multiClient.removeServer(url);
    connectedUrls = connectedUrls.filter(u => u !== url);
    if (multiClient.serverCount === 0) {
      canvas.setMcpConnected(false, '', []);
      mcpRecipes = [];
    } else {
      const allTools = multiClient.listAllTools();
      canvas.setMcpConnected(true, multiClient.listServers().map(s => s.name).join(', '), allTools as Parameters<typeof canvas.setMcpConnected>[2]);
    }
  }

  async function addAllServers() {
    for (const server of MCP_DEMO_SERVERS) {
      if (!connectedUrls.includes(server.url)) {
        await addMcpServer(server.url);
      }
    }
  }

  // ── Layers for buildSystemPrompt ───────────────────────────────────────────
  const layers = $derived.by((): ToolLayer[] => {
    const result: ToolLayer[] = [];
    if (canvas.mcpConnected) {
      const mcpLayer: McpLayer = {
        source: 'mcp',
        serverUrl: '',
        serverName: canvas.mcpName ?? undefined,
        tools: fromMcpTools(canvas.mcpTools as Parameters<typeof fromMcpTools>[0]),
        recipes: mcpRecipes.length > 0 ? mcpRecipes : undefined,
      };
      result.push(mcpLayer);
    }
    const serverNames = canvas.mcpName?.split(', ').filter(Boolean) ?? [];
    const uiRecipes = filterRecipesByServer(WEBMCP_RECIPES, serverNames);
    const uiLayer: UILayer = {
      source: 'ui',
      recipes: uiRecipes.length > 0 ? uiRecipes : undefined,
    };
    result.push(uiLayer);
    return result;
  });

  // ── Test recipe ────────────────────────────────────────────────────────────
  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  async function testRecipe() {
    if (testing) return;
    conversationHistory = []; // Reset between recipe tests

    // Build the prompt for the recipe
    let prompt = '';
    if (selectedRecipe) {
      prompt = `Execute cette recette WebMCP UI :\n\nNom: ${selectedRecipe.name}\nDescription: ${selectedRecipe.description ?? ''}\nWhen: ${selectedRecipe.when}\n\n${selectedRecipe.body}`;
    } else if (selectedMcpRecipe) {
      prompt = `Execute la recette MCP "${selectedMcpRecipe.name}"${selectedMcpRecipe.description ? ` (${selectedMcpRecipe.description})` : ''}. Utilise get_recipe pour obtenir les details puis execute-la.`;
    } else {
      return;
    }

    // Reset preview
    previewBlocks = [];
    previewText = '';
    previewError = '';
    chatTimer = 0;
    chatToolCount = 0;
    chatLastTool = '';
    testing = true;
    canvas.setGenerating(true);
    abortController = new AbortController();
    const timerInterval = setInterval(() => chatTimer++, 1000);

    try {
      const systemPrompt = buildSystemPrompt(layers, { toolMode: 'smart' });

      const result = await runAgentLoop(prompt, {
        client: multiClient.hasConnections ? multiClient as any : undefined,
        provider: getProvider(),
        systemPrompt: systemPrompt || undefined,
        toolMode: 'smart',
        maxIterations: 15,
        maxTokens: 4096,
        temperature: 1.0,
        cacheEnabled: true,
        signal: abortController!.signal,
        initialMessages: trimConversationHistory(conversationHistory, 150_000),
        layers,
        callbacks: {
          onLLMResponse: (response, latencyMs) => {
            if (response.usage) {
              tokenTracker.record(response.usage, latencyMs);
            } else if (response.stats) {
              tokenTracker.recordEstimate(0, response.stats.totalTokens * 4, latencyMs);
            }
          },
          onBlock: (type, data) => {
            previewBlocks = [...previewBlocks, { id: uid(), type, data }];
          },
          onClear: () => { previewBlocks = []; },
          onText: (text) => { if (text) previewText = text; },
          onToolCall: (call) => {
            chatToolCount++;
            chatLastTool = call.name;
          },
        },
      });

      conversationHistory = result.messages;
      if (result.text) previewText = result.text;
    } catch (e) {
      previewError = e instanceof Error ? e.message : String(e);
    } finally {
      clearInterval(timerInterval);
      abortController = null;
      testing = false;
      canvas.setGenerating(false);
    }
  }

  function stopTest() {
    abortController?.abort();
  }

  function selectRecipe(id: string, source: 'local' | 'mcp') {
    selectedId = id;
    selectedSource = source;
  }

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('webmcp-theme', next); } catch {}
    const tokens = THEME_MAP[next];
    if (tokens) for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--${k}`, v);
  }
</script>

<svelte:head><title>Auto-UI recipes</title></svelte:head>

<div class="h-screen flex flex-col overflow-hidden bg-bg">

  <!-- TOPBAR -->
  <header class="h-12 flex items-center gap-3 px-4 border-b border-border bg-surface flex-shrink-0">
    <span class="font-mono text-sm font-bold flex-shrink-0">
      <span class="text-text1">Auto-UI</span> <span class="text-accent">recipes</span>
    </span>

    <div class="flex-1"></div>

    <!-- Settings toggle -->
    <button
      class="font-mono text-[10px] h-6 px-2 rounded border transition-colors flex-shrink-0
             {settingsOpen ? 'border-accent bg-accent/10 text-accent' : 'border-border2 text-text2 hover:text-text1'}"
      onclick={() => settingsOpen = !settingsOpen}
    >
      MCP
    </button>

    {#if testing}
      <button
        class="font-mono text-[10px] h-6 px-2 rounded border border-accent2/40 bg-accent2/10 text-accent2 hover:bg-accent2/20 transition-colors flex-shrink-0"
        onclick={stopTest}
      >
        Stop
      </button>
    {/if}

    <LLMSelector value={canvas.llm} onchange={(v) => canvas.setLlm(v)} />

    <McpStatus
      connecting={canvas.mcpConnecting}
      connected={canvas.mcpConnected}
      name={canvas.mcpName ?? 'non connecte'}
    />

    {#if gemmaStatus === 'ready'}
      <span class="font-mono text-[10px] text-teal flex items-center gap-1 flex-shrink-0">
        <span class="w-1.5 h-1.5 rounded-full bg-teal"></span>
        {({'gemma-e2b':'Gemma E2B','gemma-e4b':'Gemma E4B'} as Record<string,string>)[canvas.llm] ?? canvas.llm}
      </span>
    {/if}

    <span class="font-mono text-[10px] text-text2 flex-shrink-0">
      {WEBMCP_RECIPES.length} local + {mcpRecipes.length} mcp
    </span>

    <button
      class="font-mono text-xs h-7 px-2 rounded border border-border2 text-text2 hover:text-text1 transition-all flex-shrink-0"
      onclick={toggleTheme} aria-label="Toggle theme"
    >
      &#9788;
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
      modelName={({'gemma-e2b':'Gemma E2B','gemma-e4b':'Gemma E4B'} as Record<string,string>)[canvas.llm] ?? canvas.llm}
      onunload={unloadGemma}
    />
  {/if}

  <!-- MAIN AREA -->
  <div class="flex-1 flex overflow-hidden">

    <!-- LEFT: Recipe List -->
    <div class="w-64 flex-shrink-0 border-r border-border bg-surface overflow-hidden flex flex-col">
      <RecipeList
        localRecipes={WEBMCP_RECIPES}
        {mcpRecipes}
        {selectedId}
        onselect={selectRecipe}
      />
    </div>

    <!-- RIGHT: Detail + Preview -->
    <div class="flex-1 flex flex-col overflow-hidden">

      <!-- Settings Panel (collapsible) -->
      {#if settingsOpen}
        <div class="border-b border-border bg-surface p-3 flex-shrink-0 overflow-y-auto max-h-[300px]">
          <RemoteMCPserversDemo
            servers={MCP_DEMO_SERVERS}
            {connectedUrls}
            loading={loadingUrls}
            onconnect={addMcpServer}
            onconnectall={addAllServers}
            ondisconnect={removeMcpServer}
          />
        </div>
      {/if}

      <!-- Detail -->
      <div class="flex-1 overflow-hidden border-b border-border">
        <RecipeDetail
          recipe={selectedRecipe}
          mcpRecipe={selectedMcpRecipe}
          ontest={testRecipe}
          {testing}
        />
      </div>

      <!-- Preview -->
      <div class="h-[280px] flex-shrink-0 overflow-hidden">
        <RecipePreview
          blocks={previewBlocks}
          active={testing}
          elapsed={chatTimer}
          toolCalls={chatToolCount}
          lastTool={chatLastTool}
          textOutput={previewText}
          error={previewError}
        />
      </div>
    </div>
  </div>
</div>
