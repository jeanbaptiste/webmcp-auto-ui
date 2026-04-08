<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { base } from '$app/paths';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { listSkills } from '@webmcp-auto-ui/sdk';
  import type { Skill } from '@webmcp-auto-ui/sdk';
  import { McpMultiClient } from '@webmcp-auto-ui/core';
  import { AnthropicProvider, GemmaProvider, runAgentLoop, fromMcpTools, trimConversationHistory, summarizeChat, TokenTracker } from '@webmcp-auto-ui/agent';
  import type { ChatMessage } from '@webmcp-auto-ui/agent';
  import { McpStatus, GemmaLoader, AgentProgress, EphemeralBubble, TokenBubble, bus, layoutAdapter } from '@webmcp-auto-ui/ui';
  import { Menu, ExternalLink } from 'lucide-svelte';
  import FlexGrid from '$lib/FlexGrid.svelte';
  import HistoryModal from '$lib/HistoryModal.svelte';
  import SettingsDrawer from '$lib/SettingsDrawer.svelte';

  // ── State ─────────────────────────────────────────────────────────────────
  let input = $state('');
  let mcpToken = $state('');
  let conversationHistory = $state<ChatMessage[]>([]);
  let historyLog = $state<{id:string; role:string; content:string; ts:Date}[]>([]);
  let ephemeral = $state<{id:string; role:'user'|'assistant'; html:string}[]>([]);
  let historyOpen = $state(false);
  let settingsOpen = $state(false);
  let chatTimer = $state(0);
  let chatToolCount = $state(0);
  let chatLastTool = $state('');
  let maxContextTokens = $state(150_000);
  let maxTokens = $state(4096);
  let cacheEnabled = $state(true);
  let systemPrompt = $state(`Tu es un assistant UI connecté à un serveur MCP.

Tu as accès à deux familles d'outils :
1. **Outils DATA** (exposés par le serveur MCP connecté) — pour interroger les données
2. **Outils UI** (render_*) — pour composer l'interface graphique

WORKFLOW OBLIGATOIRE :
1. Utilise un outil DATA pour récupérer les données
2. Puis utilise un outil UI pour afficher les résultats visuellement
3. Ta réponse texte doit être TRÈS courte (1-2 phrases max) — l'essentiel est dans l'UI

CHOIX DES OUTILS UI :
- liste tous les outils MCP et WEBMCP

Propose TOUJOURS la visualisation la plus pertinente. Combine plusieurs render_* quand c'est utile. Sois très concis (1-2 phrases max).`);

  // FlexGrid ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let flexGrid: any;
  let layoutMode = $state<'float' | 'grid'>('float');

  // Skills
  let skills = $state<Skill[]>([]);

  // ── Token tracking ────────────────────────────────────────────────────
  const tokenTracker = new TokenTracker();
  let tokenMetrics = $state(tokenTracker.metrics);
  let showTokens = $state(true);
  tokenTracker.subscribe(m => { tokenMetrics = m; });

  // Export clipboard feedback
  let exportCopied = $state(false);
  let includeSummary = $state(true);
  let allToolsUsed = $state<string[]>([]);

  // ── Multi-MCP ────────────────────────────────────────────────────────────
  let multiClient = $state<McpMultiClient>(new McpMultiClient());
  let connectedUrls = $state<string[]>([]);
  let loadingUrls = $state<string[]>([]);
  let mcpRecipes = $state<{name:string; description?:string}[]>([]);

  async function addMcpServer(url: string) {
    if (!url.trim()) return;
    settingsOpen = false;
    loadingUrls = [...loadingUrls, url];
    canvas.setMcpConnecting(true);
    try {
      const opts = mcpToken.trim() ? { headers: { Authorization: `Bearer ${mcpToken.trim()}` } } : undefined;
      const { name, tools } = await multiClient.addServer(url.trim(), opts);
      connectedUrls = [...connectedUrls, url];
      const allTools = multiClient.listAllTools();
      canvas.setMcpConnected(true, multiClient.listServers().map(s => s.name).join(', '), allTools as Parameters<typeof canvas.setMcpConnected>[2]);

      // G — Load recipes if available
      if (tools.some(t => t.name === 'list_recipes')) {
        try {
          const r = await multiClient.callTool('list_recipes', {});
          const text = r.content?.find((c: any) => c.type === 'text') as any;
          if (text?.text) {
            const parsed = JSON.parse(text.text);
            const newRecipes: {name:string; description?:string}[] = Array.isArray(parsed) ? parsed : (parsed?.recipes ?? []);
            // Merge recipes (avoid duplicates by name)
            const existing = new Set(mcpRecipes.map(r => r.name));
            mcpRecipes = [...mcpRecipes, ...newRecipes.filter(r => !existing.has(r.name))];
          }
        } catch { /* pas de recettes */ }
      }
    } catch(e) {
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
    const { MCP_DEMO_SERVERS } = await import('@webmcp-auto-ui/sdk');
    for (const server of MCP_DEMO_SERVERS) {
      if (!connectedUrls.includes(server.url)) {
        await addMcpServer(server.url);
      }
    }
  }

  // ── Gemma ─────────────────────────────────────────────────────────────────
  let gemmaProvider = $state<GemmaProvider | null>(null);
  let gemmaStatus = $state<'idle'|'loading'|'ready'|'error'>('idle');
  let gemmaProgress = $state(0);
  let gemmaElapsed = $state(0);
  let gemmaLoadStart = $state(0);
  let gemmaLoadedMB = $state(0);
  let gemmaTotalMB = $state(0);
  let gemmaTimerInterval = $state<ReturnType<typeof setInterval> | null>(null);

  // H — Provider singleton
  const anthropicProvider = new AnthropicProvider({ proxyUrl: `${base}/api/chat` });

  function getProvider() {
    if (canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') {
      // Destroy existing provider if model changed
      if (gemmaProvider && gemmaProvider.model !== canvas.llm) {
        unloadGemma();
      }
      if (!gemmaProvider) {
        gemmaProvider = new GemmaProvider({
          workerFactory: () => new Worker(new URL('@webmcp-auto-ui/agent/litert-worker', import.meta.url), { type: 'module' }),
          model: canvas.llm,
          onProgress: (p, _s, loaded, total) => {
            gemmaProgress = p;
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
    // H — Return singleton, update model via setModel
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

  // ── Effective prompt (K — structured for cache) ──────────────────────────
  const WEBMCP_UI_TOOLS = [
    'render_stat', 'render_kv', 'render_list', 'render_table',
    'render_chart', 'render_chart_rich', 'render_timeline', 'render_profile',
    'render_trombinoscope', 'render_hemicycle', 'render_sankey', 'render_cards',
    'render_json', 'render_d3', 'render_text', 'render_alert', 'render_code',
    'render_tags', 'render_gallery', 'render_carousel', 'render_log', 'clear_canvas',
    'update_block', 'move_block', 'resize_block', 'style_block',
  ];

  const effectivePrompt = $derived.by(() => {
    // 1. Partie stable (cacheable)
    const stable = systemPrompt.replace(
      '- liste tous les outils MCP et WEBMCP',
      WEBMCP_UI_TOOLS.map(t => `- ${t}`).join('\n')
    );

    // 2. Outils UI (stable tant qu'on ne change pas la liste)
    const uiToolsSection = '\n\n--- Outils UI disponibles ---\n' +
      WEBMCP_UI_TOOLS.map(t => `- ${t}`).join('\n');

    // 3. Contexte MCP dynamique (change quand on connecte/déconnecte)
    let mcpSection = '';
    if (canvas.mcpConnected) {
      const dataTools = (canvas.mcpTools as {name:string;description?:string}[])
        .filter(t => !t.name.startsWith('render_') && t.name !== 'clear_canvas');
      if (dataTools.length > 0) {
        mcpSection += `\n--- Contexte MCP : ${canvas.mcpName ?? 'serveur connecté'} ---\n` +
          `Outils DATA disponibles :\n` +
          dataTools.map(t => `- ${t.name}${t.description ? ' : ' + t.description.split('\n')[0] : ''}`).join('\n');
      }
      // G — Inject recipes into prompt
      if (mcpRecipes.length > 0) {
        mcpSection += `\nRecettes/skills disponibles (${mcpRecipes.length}) :\n` +
          mcpRecipes.map(r => `- ${r.name}${r.description ? ' : ' + r.description : ''}`).join('\n');
      }
    }

    return stable + uiToolsSection + mcpSection;
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  function pushHistory(role: string, content: string) {
    historyLog = [...historyLog, { id: uid(), role, content, ts: new Date() }];
  }

  function updateEphemeral(id: string, html: string) {
    ephemeral = ephemeral.map(e => e.id === id ? { ...e, html } : e);
  }

  // ── HyperSkill export ────────────────────────────────────────────────────
  async function exportHsUrl() {
    const skill = canvas.buildSkillJSON() as Record<string, unknown>;

    if (includeSummary && conversationHistory.length > 0) {
      try {
        const result = await summarizeChat({
          messages: conversationHistory,
          provider: getProvider(),
          toolsUsed: allToolsUsed,
          toolCallCount: chatToolCount,
          mcpServers: multiClient.listServers().map(s => s.name),
          skillsReferenced: skills.map(s => s.name),
        });
        skill.chatSummary = result.chatSummary;
        skill.provenance = result.provenance;
      } catch { /* don't block export */ }
    }

    const json = JSON.stringify(skill);
    const param = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const url = `${window.location.origin}/flex?hs=${param}`;
    await navigator.clipboard.writeText(url);
    exportCopied = true;
    setTimeout(() => { exportCopied = false; }, 2000);
  }

  // ── Agent ─────────────────────────────────────────────────────────────────
  async function sendMessage(msg: string) {
    if (!msg.trim() || canvas.generating) return;
    input = '';

    // Clear previous bubbles on new message
    ephemeral = [];

    pushHistory('user', msg);
    const userId = uid();
    ephemeral = [...ephemeral, { id: userId, role: 'user', html: msg }];

    const assistantId = uid();
    ephemeral = [...ephemeral, { id: assistantId, role: 'assistant', html: '…' }];

    canvas.setGenerating(true);
    chatTimer = 0; chatToolCount = 0; chatLastTool = '';
    const timerInterval = setInterval(() => chatTimer++, 1000);

    try {
      const result = await runAgentLoop(msg, {
        client: multiClient.hasConnections ? multiClient as any : undefined,
        provider: getProvider(),
        systemPrompt: effectivePrompt || undefined,
        maxIterations: 15,
        maxTokens,
        cacheEnabled,
        initialMessages: trimConversationHistory(conversationHistory, maxContextTokens),
        mcpTools: fromMcpTools(canvas.mcpTools as Parameters<typeof fromMcpTools>[0]),
        callbacks: {
          onLLMResponse: (response, latencyMs) => {
            if (response.usage) tokenTracker.record(response.usage, latencyMs);
          },
          onBlock:   (type, data) => flexGrid?.addBlock(type, data),
          onClear:   () => flexGrid?.clearBlocks(),
          onUpdate:  (id, data) => bus.send('agent', id, 'data-update', data),
          onMove:    (id, x, y) => layoutAdapter.move(id, x, y),
          onResize:  (id, w, h) => layoutAdapter.resize(id, w, h),
          onStyle:   (id, styles) => layoutAdapter.style(id, styles),
          onText:    (text) => { if (text) updateEphemeral(assistantId, text); },
          onToolCall: (call) => {
            chatToolCount++; chatLastTool = call.name;
            allToolsUsed = [...allToolsUsed, call.name];
            updateEphemeral(assistantId, `🔧 <strong>${call.name}</strong>…`);
          },
        },
      });
      conversationHistory = result.messages;
      if (result.text) {
        updateEphemeral(assistantId, result.text);
        pushHistory('assistant', result.text);
      }
      // Bubbles stay visible until next sendMessage clears them
    } catch(e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      updateEphemeral(assistantId, `❌ ${errMsg}`);
      pushHistory('system', `❌ ${errMsg}`);
      // Error bubble stays visible until next sendMessage clears it
    } finally {
      clearInterval(timerInterval);
      canvas.setGenerating(false);
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('webmcp-theme', next); } catch {}
    import('@webmcp-auto-ui/ui').then(({ THEME_MAP }) => {
      const tokens = THEME_MAP[next as 'light'|'dark'];
      if (tokens) for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--${k}`, v);
    });
  }

  // E — Support ?hs= param + skills init
  onMount(() => {
    const param = new URLSearchParams(window.location.search).get('hs');
    if (param) {
      canvas.loadFromParam(param).then(() => {
        if (canvas.mcpUrl) addMcpServer(canvas.mcpUrl);
      });
    }
    skills = listSkills();
  });
</script>

<svelte:head><title>Auto-UI flex</title></svelte:head>

<div class="h-screen flex flex-col overflow-hidden bg-bg">

  <!-- TOPBAR -->
  <header class="h-12 flex items-center gap-3 px-4 border-b border-border bg-surface flex-shrink-0">
    <button class="text-text2 hover:text-text1 transition-colors flex-shrink-0"
            onclick={() => settingsOpen = true} aria-label="Paramètres">
      <Menu size={18} />
    </button>
    <span class="font-mono text-sm font-bold flex-shrink-0">
      <span class="text-text1">Auto-UI</span><span class="text-accent"> flex</span>
    </span>
    <div class="flex-1"></div>
    <button
      class="font-mono text-[10px] h-6 px-2 rounded border transition-colors flex-shrink-0
             {layoutMode === 'grid' ? 'border-accent bg-accent/10 text-accent' : 'border-border2 text-text2 hover:text-text1'}"
      onclick={() => layoutMode = layoutMode === 'float' ? 'grid' : 'float'}>
      {layoutMode === 'grid' ? '⊞ grid' : '⊞ float'}
    </button>
    {#if canvas.blockCount > 0}
      <!-- J — hidden on mobile -->
      <span class="hidden md:inline font-mono text-[10px] text-text2">{canvas.blockCount} bloc{canvas.blockCount !== 1 ? 's' : ''}</span>
      <button class="hidden md:inline font-mono text-[10px] text-text2 hover:text-accent2 transition-colors"
              onclick={() => flexGrid?.clearBlocks()}>effacer</button>
    {/if}
    <!-- E — export button -->
    <label class="hidden md:flex items-center gap-1.5 font-mono text-[10px] text-text2 cursor-pointer flex-shrink-0">
      <input type="checkbox" bind:checked={includeSummary} class="accent-accent w-3 h-3" />
      synthèse
    </label>
    <button class="font-mono text-xs h-7 px-3 rounded border border-border2 text-text2 hover:text-text1 transition-colors flex-shrink-0"
            onclick={exportHsUrl}
            title="Copier le lien HyperSkill">
      {#if exportCopied}
        <span class="text-teal">copié !</span>
      {:else}
        <ExternalLink size={14} class="inline -mt-px" /> <span class="hidden md:inline">exporter</span>
      {/if}
    </button>
    <button class="font-mono text-xs h-7 px-3 rounded border border-border2 text-text2 hover:text-text1 transition-colors flex-shrink-0"
            onclick={() => historyOpen = true}>
      historique
    </button>
    <McpStatus connecting={canvas.mcpConnecting} connected={canvas.mcpConnected} name={canvas.mcpName ?? 'non connecté'} />
    <button class="font-mono text-xs h-7 px-2 rounded border border-border2 text-text2 hover:text-text1 transition-all flex-shrink-0"
            onclick={toggleTheme} aria-label="Toggle theme">☀</button>
  </header>

  <!-- GEMMA LOADER -->
  <GemmaLoader
    status={gemmaStatus}
    progress={gemmaProgress}
    elapsed={gemmaElapsed}
    loadedMB={gemmaLoadedMB}
    totalMB={gemmaTotalMB}
    modelName={({'gemma-e2b':'Gemma E2B','gemma-e4b':'Gemma E4B'} as Record<string,string>)[canvas.llm] ?? canvas.llm}
    onunload={unloadGemma}
  />

  <!-- CANVAS + EPHEMERAL WRAPPER -->
  <div class="flex-1 relative overflow-hidden">
    <FlexGrid bind:this={flexGrid} class="w-full h-full" {layoutMode} />

    <!-- Token usage bubble — top left of canvas, flush under topbar -->
    <div class="absolute top-1 left-2 z-20 pointer-events-none">
      <TokenBubble metrics={tokenMetrics} visible={showTokens} />
    </div>

    <!-- Ephemeral bubbles — flottent au-dessus de l'input -->
    <div class="absolute bottom-3 left-[50px] right-[50px] flex flex-col gap-2 pointer-events-none z-20">
      <EphemeralBubble {ephemeral} />
    </div>
  </div>

  <!-- AGENT PROGRESS -->
  <AgentProgress
    active={canvas.generating}
    elapsed={chatTimer}
    toolCalls={chatToolCount}
    lastTool={chatLastTool}
  />

  <!-- INPUT BAR -->
  <div class="flex-shrink-0 px-[50px] py-4 bg-surface border-t border-border">
    <input
      type="text"
      bind:value={input}
      onkeydown={onKeydown}
      placeholder={canvas.mcpConnected
        ? `Demandez une interface sur ${canvas.mcpName}…`
        : 'Ouvrez ☰ pour connecter un MCP, puis décrivez une interface…'}
      disabled={canvas.generating}
      class="w-full bg-surface2 border border-border2 rounded-xl px-5 py-3 text-sm font-mono text-text1
             outline-none placeholder:text-text2/50 focus:border-accent/60 transition-colors
             disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>

</div>

<!-- SETTINGS DRAWER -->
<SettingsDrawer
  bind:open={settingsOpen}
  bind:mcpToken
  bind:systemPrompt
  bind:maxTokens
  bind:maxContextTokens
  bind:cacheEnabled
  bind:showTokens
  onconnect={() => addMcpServer(canvas.mcpUrl)}
  {connectedUrls}
  {loadingUrls}
  onaddserver={addMcpServer}
  onaddall={addAllServers}
  onremoveserver={removeMcpServer}
/>

<!-- HISTORY MODAL -->
<HistoryModal bind:open={historyOpen} messages={historyLog} />
