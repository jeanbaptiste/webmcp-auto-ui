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
  import { McpStatus, LLMSelector, GemmaLoader, RemoteMCPserversDemo, AgentConsole, THEME_MAP } from '@webmcp-auto-ui/ui';
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

  // Agent logs
  let agentLogs = $state<{ ts: number; type: string; detail: string }[]>([]);

  // Console drawer
  let consoleHeight = $state(200);
  let dragging = $state(false);
  let dragStartY = $state(0);
  let dragStartH = $state(0);
  const CONSOLE_MIN_H = 80;
  const CONSOLE_MAX_RATIO = 0.5;

  function onConsoleDragStart(e: PointerEvent) {
    dragging = true;
    dragStartY = e.clientY;
    dragStartH = consoleHeight;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onConsoleDragMove(e: PointerEvent) {
    if (!dragging) return;
    const delta = dragStartY - e.clientY;
    const maxH = Math.floor(window.innerHeight * CONSOLE_MAX_RATIO);
    consoleHeight = Math.min(maxH, Math.max(CONSOLE_MIN_H, dragStartH + delta));
  }
  function onConsoleDragEnd() { dragging = false; }

  // Settings panel
  let settingsOpen = $state(false);

  // Mobile tabs
  let mobileTab = $state<'list' | 'detail' | 'preview'>('list');

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

  // ── Placeholder contextuel ──────────────────────────────────────────────────
  const PLACEHOLDER_MAP: Record<string, string> = {
    'inaturalist': 'Quels oiseaux observe-t-on a Paris ?',
    'tricoteuses': 'Montre-moi les derniers scrutins publics',
    'nasa': "Montre-moi les images APOD de cette semaine",
    'openmeteo': "Quel temps fait-il a Lyon demain ?",
    'metmuseum': 'Cherche des tableaux impressionnistes',
    'hackernews': 'Quelles sont les top stories du moment ?',
  };

  const PLACEHOLDER_ID_MAP: Record<string, string> = {
    'cartographier-observations-biodiversite': PLACEHOLDER_MAP['inaturalist'],
    'afficher-profil-parlementaire-avec-hemicycle-et-votes': PLACEHOLDER_MAP['tricoteuses'],
    'parlementaire-profile': PLACEHOLDER_MAP['tricoteuses'],
    'explorer-dossiers-legislatifs-parcours-texte': "Ou en est le projet de loi finances 2026 ?",
    'rechercher-textes-juridiques-legifrance': "Cherche l'article L.121-1 du Code de commerce",
    'afficher-galerie-images-depuis-urls-mcp': PLACEHOLDER_MAP['nasa'],
    'gallery-images': PLACEHOLDER_MAP['nasa'],
    'analyser-actualites-hacker-news': PLACEHOLDER_MAP['hackernews'],
    'visualiser-previsions-meteo-avec-graphiques-et-kpi': PLACEHOLDER_MAP['openmeteo'],
    'weather-viz': PLACEHOLDER_MAP['openmeteo'],
    'afficher-oeuvres-art-collection-musee': PLACEHOLDER_MAP['metmuseum'],
  };

  const DEFAULT_PLACEHOLDER = 'Posez une question en rapport avec cette recette...';

  const chatPlaceholder = $derived.by((): string => {
    if (!selectedId) return DEFAULT_PLACEHOLDER;
    // Try by recipe id first
    const byId = PLACEHOLDER_ID_MAP[selectedId.replace(/^mcp:/, '')];
    if (byId) return byId;
    // Try by server name
    const recipe = selectedRecipe;
    if (recipe?.servers?.length) {
      for (const srv of recipe.servers) {
        const lower = srv.toLowerCase();
        for (const [key, val] of Object.entries(PLACEHOLDER_MAP)) {
          if (lower.includes(key) || key.includes(lower)) return val;
        }
      }
    }
    return DEFAULT_PLACEHOLDER;
  });

  // ── Agent send ─────────────────────────────────────────────────────────────
  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  function pushLog(type: string, detail: string) {
    agentLogs = [...agentLogs, { ts: Date.now(), type, detail }];
  }

  async function sendMessage(prompt: string) {
    if (testing || !prompt.trim()) return;

    // Reset transient state but keep blocks + text for continuous conversation
    previewError = '';
    chatTimer = 0;
    chatToolCount = 0;
    chatLastTool = '';
    agentLogs = [];
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
          onIterationStart: (i: number, max: number) => {
            pushLog('iteration', `Iteration ${i}/${max}`);
          },
          onLLMRequest: (messages: unknown[], tools: unknown[]) => {
            pushLog('request', `${(messages as unknown[]).length} messages, ${(tools as unknown[]).length} tools`);
          },
          onLLMResponse: (response: any, latencyMs: number) => {
            const tokens = response.usage;
            pushLog('response', `${tokens?.input ?? '?'}in ${tokens?.output ?? '?'}out, ${Math.round(latencyMs)}ms, ${response.stopReason}`);
            if (response.usage) {
              tokenTracker.record(response.usage, latencyMs);
            } else if (response.stats) {
              tokenTracker.recordEstimate(0, response.stats.totalTokens * 4, latencyMs);
            }
          },
          onBlock: (type: string, data: Record<string, unknown>) => {
            previewBlocks = [...previewBlocks, { id: uid(), type, data }];
          },
          onClear: () => { previewBlocks = []; },
          onText: (text: string) => {
            if (text) {
              previewText = text;
              pushLog('text', text.slice(0, 100));
            }
          },
          onToolCall: (call: any) => {
            chatToolCount++;
            chatLastTool = call.name;
            const argsPreview = JSON.stringify(call.args ?? {}).slice(0, 60);
            const resultPreview = typeof call.result === 'string' ? call.result.slice(0, 60) : JSON.stringify(call.result ?? '').slice(0, 60);
            pushLog('tool', `${call.name}(${argsPreview}) -> ${resultPreview} [${call.elapsed ?? '?'}ms]`);
          },
          onDone: (metrics: any) => {
            pushLog('done', `${metrics.iterations} iter, ${metrics.toolCalls} tools, ${metrics.totalTokens} tokens, ${Math.round(metrics.totalLatencyMs)}ms`);
          },
        },
      });

      conversationHistory = result.messages;
      if (result.text) previewText = result.text;
    } catch (e) {
      previewError = e instanceof Error ? e.message : String(e);
      pushLog('error', previewError);
    } finally {
      clearInterval(timerInterval);
      abortController = null;
      testing = false;
      canvas.setGenerating(false);
    }
  }

  function testRecipe() {
    if (testing) return;
    // Reset conversation for a fresh recipe test
    conversationHistory = [];
    previewBlocks = [];
    previewText = '';
    agentLogs = [];

    let prompt = '';
    if (selectedRecipe) {
      prompt = `Execute cette recette WebMCP UI :\n\nNom: ${selectedRecipe.name}\nDescription: ${selectedRecipe.description ?? ''}\nWhen: ${selectedRecipe.when}\n\n${selectedRecipe.body}`;
    } else if (selectedMcpRecipe) {
      prompt = `Execute la recette MCP "${selectedMcpRecipe.name}"${selectedMcpRecipe.description ? ` (${selectedMcpRecipe.description})` : ''}. Utilise get_recipe pour obtenir les details puis execute-la.`;
    } else {
      return;
    }

    sendMessage(prompt);
  }

  function stopTest() {
    abortController?.abort();
  }

  function clearPreview() {
    conversationHistory = [];
    previewBlocks = [];
    previewText = '';
    previewError = '';
    chatTimer = 0;
    chatToolCount = 0;
    chatLastTool = '';
    agentLogs = [];
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

  <!-- Settings Panel (collapsible, full-width) -->
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

  <!-- MOBILE TABS (< 768px) -->
  <div class="mobile-tabs">
    <button class="mobile-tab" class:active={mobileTab === 'list'} onclick={() => mobileTab = 'list'}>Recettes</button>
    <button class="mobile-tab" class:active={mobileTab === 'detail'} onclick={() => mobileTab = 'detail'}>Detail</button>
    <button class="mobile-tab" class:active={mobileTab === 'preview'} onclick={() => mobileTab = 'preview'}>Preview</button>
  </div>

  <!-- MAIN 3-COLUMN AREA -->
  <div class="columns-area">

    <!-- LEFT: Recipe List -->
    <div class="col-list" class:mobile-hidden={mobileTab !== 'list'}>
      <RecipeList
        localRecipes={WEBMCP_RECIPES}
        {mcpRecipes}
        {selectedId}
        onselect={(id, source) => { selectRecipe(id, source); mobileTab = 'detail'; }}
      />
    </div>

    <!-- CENTER: Recipe Detail -->
    <div class="col-detail" class:mobile-hidden={mobileTab !== 'detail'}>
      <RecipeDetail
        recipe={selectedRecipe}
        mcpRecipe={selectedMcpRecipe}
        ontest={() => { testRecipe(); mobileTab = 'preview'; }}
        {testing}
      />
    </div>

    <!-- RIGHT: Preview + Chat -->
    <div class="col-preview" class:mobile-hidden={mobileTab !== 'preview'}>
      <RecipePreview
        blocks={previewBlocks}
        active={testing}
        elapsed={chatTimer}
        toolCalls={chatToolCount}
        lastTool={chatLastTool}
        textOutput={previewText}
        error={previewError}
        placeholder={chatPlaceholder}
        hasConversation={conversationHistory.length > 0 || previewBlocks.length > 0 || !!previewText}
        onsend={sendMessage}
        onstop={stopTest}
        onclear={clearPreview}
      />
    </div>
  </div>

  <!-- BOTTOM: Resizable AgentConsole drawer -->
  <div class="console-drawer" style="height:{consoleHeight}px">
    <!-- Resize bar -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="resize-bar"
         onpointerdown={onConsoleDragStart}
         onpointermove={onConsoleDragMove}
         onpointerup={onConsoleDragEnd}>
      <div class="resize-grip"></div>
    </div>

    <AgentConsole logs={agentLogs} onclear={() => agentLogs = []} />
  </div>
</div>

<style>
  /* ── 3-column layout ─────────────────────────────────────────── */
  .columns-area {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
  }

  .col-list {
    width: 14rem; /* w-56 */
    flex-shrink: 0;
    border-right: 1px solid var(--color-border, #222);
    background: var(--color-surface, #1a1a2e);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .col-detail {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--color-border, #222);
    min-width: 0;
  }

  .col-preview {
    width: 400px;
    flex-shrink: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ── Console drawer ──────────────────────────────────────────── */
  .console-drawer {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: var(--color-bg, #0e0e16);
    border-top: 1px solid var(--color-border2, #333);
    overflow: hidden;
  }

  .resize-bar {
    height: 6px;
    cursor: ns-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--color-surface, #1a1a2e);
    border-bottom: 1px solid var(--color-border, #222);
    touch-action: none;
  }
  .resize-bar:hover {
    background: var(--color-surface2, #1e1e2e);
  }
  .resize-grip {
    width: 32px;
    height: 2px;
    border-radius: 1px;
    background: var(--color-text2, #666);
    opacity: 0.4;
  }
  .resize-bar:hover .resize-grip {
    opacity: 0.7;
  }

  /* ── Mobile tabs ─────────────────────────────────────────────── */
  .mobile-tabs {
    display: none;
  }

  .mobile-tab {
    flex: 1;
    padding: 6px 0;
    font-family: monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text2, #888);
    background: var(--color-surface, #1a1a2e);
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .mobile-tab:hover { color: var(--color-text1, #eee); }
  .mobile-tab.active {
    color: var(--color-accent, #a78bfa);
    border-bottom-color: var(--color-accent, #a78bfa);
  }

  .mobile-hidden {
    display: none !important;
  }

  /* ── Tablet: 768–1024px → 2 columns ─────────────────────────── */
  @media (min-width: 768px) and (max-width: 1024px) {
    .mobile-tabs { display: none; }
    .mobile-hidden { display: flex !important; }

    .col-list {
      width: 12rem;
    }
    .col-detail {
      flex: 1;
      border-right: none;
    }
    .col-preview {
      /* Stack under detail on tablet */
      display: none;
    }
    /* On tablet, detail area takes full remaining width.
       Preview content is accessible via the chat input in detail area.
       For a better tablet experience, we show detail + preview stacked. */
    .columns-area {
      flex-wrap: wrap;
    }
  }

  /* ── Mobile: < 768px → tabs ──────────────────────────────────── */
  @media (max-width: 767px) {
    .mobile-tabs {
      display: flex;
      flex-shrink: 0;
      border-bottom: 1px solid var(--color-border, #222);
    }

    .columns-area {
      flex: 1;
    }

    .col-list,
    .col-detail,
    .col-preview {
      width: 100% !important;
      flex: 1;
      border-right: none;
    }

    .console-drawer {
      height: 120px !important;
    }
  }

  /* ── Desktop: > 1024px → 3 columns (default, no media query needed) ── */
  @media (min-width: 1025px) {
    .mobile-tabs { display: none; }
    .mobile-hidden { display: flex !important; }
  }
</style>
