<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { base } from '$app/paths';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { listSkills, encodeHyperSkill } from '@webmcp-auto-ui/sdk';
  import type { Skill, HyperSkill } from '@webmcp-auto-ui/sdk';
  import { McpMultiClient } from '@webmcp-auto-ui/core';
  import {
    RemoteLLMProvider, WasmProvider, LocalLLMProvider, runAgentLoop, buildSystemPrompt,
    fromMcpTools, trimConversationHistory, summarizeChat, TokenTracker,
    buildToolsFromLayers, runDiagnostics, buildDiscoveryCache,
  } from '@webmcp-auto-ui/agent';
  import type { ChatMessage, ToolLayer, McpLayer } from '@webmcp-auto-ui/agent';
  import { autoui } from '@webmcp-auto-ui/agent';
  import { McpStatus, GemmaLoader, AgentProgress, EphemeralBubble, TokenBubble, bus, layoutAdapter } from '@webmcp-auto-ui/ui';
  import { Menu, Terminal, LayoutGrid } from 'lucide-svelte';
  import FlexGrid from '$lib/FlexGrid.svelte';
  import HistoryModal from '$lib/HistoryModal.svelte';
  import SettingsDrawer from '$lib/SettingsDrawer.svelte';
  import LogDrawer from '$lib/LogDrawer.svelte';
  import DebugPanel from '$lib/DebugPanel.svelte';

  // ── State ─────────────────────────────────────────────────────────────
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
  let schemaSanitize = $state(true);
  let schemaFlatten = $state(false);
  let temperature = $state(1.0);
  let topK = $state(64);
  let maxTools = $state(8);
  let maxResultLength = $state(10000);
  let truncateResults = $state(false);
  let compressHistory = $state(false);
  let compressPreview = $state(500);
  let systemPrompt = $state('');
  let localUrl = $state('http://localhost:11434');
  let localModel = $state('');
  let composerMode = $state(true); // true = composer, false = consumer
  let layoutMode = $state<'float' | 'grid'>('float');
  let skills = $state<Skill[]>([]);

  // FlexGrid ref
  let flexGrid: { addBlock: (type: string, data: Record<string, unknown>, server?: string, component?: string) => { id: string }; clearBlocks: () => void; syncFromCanvas: () => void } | undefined;

  // ── Widget interaction → LLM pipeline ─────────────────────────────
  const INTERACTIVE_ACTIONS = new Set(['click', 'select', 'submit', 'itemclick', 'rowclick', 'cardclick', 'eventclick', 'personclick', 'groupclick', 'cellclick', 'imageclick', 'slidechange']);
  let lastInteractionTs = $state(0);
  let interactionPending = $state(false);
  const INTERACTION_DEBOUNCE_MS = 500;

  function handleWidgetInteraction(widgetId: string, widgetType: string, action: string, payload: unknown) {
    // Only allow interactive actions (no update/remove to avoid loops)
    if (!INTERACTIVE_ACTIONS.has(action)) return;
    // Debounce
    const now = Date.now();
    if (now - lastInteractionTs < INTERACTION_DEBOUNCE_MS) return;
    // Ignore if LLM is already processing
    if (canvas.generating || interactionPending) return;
    lastInteractionTs = now;

    // Build a descriptive message for the LLM
    const p = payload as Record<string, unknown> | null;
    const label = p?.name ?? p?.title ?? p?.label ?? p?.item ?? 'un element';
    const msg = `[Interaction widget] L'utilisateur a clique sur "${label}" dans le widget ${widgetType} (id: ${widgetId}). Action: ${action}. Donnees: ${JSON.stringify(payload)}`;

    // Inject into conversation and rerun agent loop
    interactionPending = true;
    sendMessage(msg).finally(() => { interactionPending = false; });
  }

  // ── Token tracking ─────────────────────────────────────────────────
  const tokenTracker = new TokenTracker();
  let tokenMetrics = $state(tokenTracker.metrics);
  let showTokens = $state(true);
  let showToolJSON = $state(false);
  tokenTracker.subscribe(m => { tokenMetrics = m; });

  let agentLogs = $state<{ ts: number; type: string; detail: string; ctxSize?: number }[]>([]);
  let abortController = $state<AbortController | null>(null);
  let exportCopied = $state(false);
  let exportState = $state<'idle' | 'loading' | 'done'>('idle');
  let exportedUrl = $state('');
  let exportModalOpen = $state(false);
  let exportedBlockSummary = $state<{count: number; types: string[]}>({count: 0, types: []});
  let includeSummary = $state(true);
  let allToolsUsed = $state<string[]>([]);

  // ── Multi-MCP ─────────────────────────────────────────────────────
  let multiClient = $state<McpMultiClient>(new McpMultiClient());
  let connectedUrls = $state<string[]>([]);
  let loadingUrls = $state<string[]>([]);
  /** Recipes indexed by server URL for proper cleanup on disconnect */
  let mcpRecipesByServer = $state<Map<string, {name:string; description?:string; serverName?:string}[]>>(new Map());
  /** Merged recipes with duplicate-name prefixing across servers */
  let mcpRecipes = $derived.by(() => {
    const all: {name:string; description?:string; serverName?:string}[] = [];
    for (const recipes of mcpRecipesByServer.values()) all.push(...recipes);
    // Detect duplicate names across servers and prefix them
    const nameCounts = new Map<string, number>();
    for (const r of all) nameCounts.set(r.name, (nameCounts.get(r.name) ?? 0) + 1);
    return all.map(r => {
      if ((nameCounts.get(r.name) ?? 0) > 1 && r.serverName) {
        return { ...r, name: `${r.serverName}: ${r.name}` };
      }
      return r;
    });
  });

  // ── Tool call details for tooltips ──────────────────────────────────
  interface ToolCallDetail {
    name: string;
    args: Record<string, unknown>;
    result?: string;
    error?: string;
    elapsed?: number;
  }
  let toolCallDetails = $state<Map<string, ToolCallDetail>>(new Map());

  async function addMcpServer(url: string) {
    if (!url.trim()) return;
    settingsOpen = false;
    loadingUrls = [...loadingUrls, url];
    canvas.setMcpConnecting(true);
    try {
      const opts = mcpToken.trim() ? { headers: { Authorization: `Bearer ${mcpToken.trim()}` } } : undefined;
      const { tools } = await multiClient.addServer(url.trim(), opts);
      connectedUrls = [...connectedUrls, url];
      const allTools = multiClient.listAllTools();
      canvas.setMcpConnected(true, multiClient.listServers().map(s => s.name).join(', '), allTools as Parameters<typeof canvas.setMcpConnected>[2]);
      if (tools.some(t => t.name === 'list_recipes')) {
        try {
          const r = await multiClient.callTool('list_recipes', {});
          const text = r.content?.find((c: any) => c.type === 'text') as any;
          if (text?.text) {
            const parsed = JSON.parse(text.text);
            const newRecipes: {name:string; description?:string}[] = Array.isArray(parsed) ? parsed : (parsed?.recipes ?? []);
            const serverName = multiClient.listServers().find(s => s.url === url.trim())?.name;
            const tagged = newRecipes.map(rec => ({ ...rec, serverName }));
            const next = new Map(mcpRecipesByServer);
            next.set(url.trim(), tagged);
            mcpRecipesByServer = next;
          }
        } catch { /* no recipes */ }
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
    // Remove recipes for the disconnected server
    const next = new Map(mcpRecipesByServer);
    next.delete(url);
    mcpRecipesByServer = next;
    if (multiClient.serverCount === 0) {
      canvas.setMcpConnected(false, '', []);
    } else {
      const allTools = multiClient.listAllTools();
      canvas.setMcpConnected(true, multiClient.listServers().map(s => s.name).join(', '), allTools as Parameters<typeof canvas.setMcpConnected>[2]);
    }
  }

  async function addAllServers() {
    const { MCP_DEMO_SERVERS } = await import('@webmcp-auto-ui/sdk');
    for (const server of MCP_DEMO_SERVERS) {
      if (!connectedUrls.includes(server.url)) await addMcpServer(server.url);
    }
  }

  // ── Gemma ──────────────────────────────────────────────────────────
  let gemmaProvider = $state<WasmProvider | null>(null);
  let gemmaStatus = $state<'idle'|'loading'|'ready'|'error'>('idle');
  let gemmaProgress = $state(0);
  let gemmaElapsed = $state(0);
  let gemmaLoadStart = $state(0);
  let gemmaLoadedMB = $state(0);
  let gemmaTotalMB = $state(0);
  let gemmaTimerInterval = $state<ReturnType<typeof setInterval> | null>(null);

  const anthropicProvider = new RemoteLLMProvider({ proxyUrl: `${base}/api/chat` });

  function getProvider() {
    if (canvas.llm === 'local') {
      return new LocalLLMProvider({ baseUrl: localUrl, model: localModel || 'llama3.2' });
    }
    if (canvas.llm === 'gemma-e2b' || canvas.llm === 'gemma-e4b') {
      if (gemmaProvider && gemmaProvider.model !== canvas.llm) unloadGemma();
      if (!gemmaProvider) {
        const wasmContext = Math.min(maxContextTokens, 32768);
        gemmaProvider = new WasmProvider({
          model: canvas.llm,
          contextSize: wasmContext,
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
              gemmaTimerInterval = setInterval(() => { gemmaElapsed = Math.floor((Date.now() - gemmaLoadStart) / 1000); }, 1000);
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
        if (p instanceof WasmProvider) p.initialize();
      }
    });
  });


  // Smart defaults: sanitize ON for Claude/local, flatten ON for Gemma/local
  $effect(() => {
    const isGemma = canvas.llm.startsWith('gemma');
    const isLocal = canvas.llm === 'local';
    schemaSanitize = isLocal ? true : !isGemma;
    schemaFlatten = isGemma || isLocal;
    truncateResults = isGemma || isLocal;
    compressHistory = isGemma || isLocal;
    if (isGemma) maxResultLength = 2000;
    else if (isLocal) maxResultLength = 3000;
    else maxResultLength = 10000;
  });

  // ── Layers & prompt ────────────────────────────────────────────────
  const layers = $derived.by((): ToolLayer[] => {
    const result: ToolLayer[] = [];
    if (canvas.mcpConnected) {
      let recipesAttached = false;
      for (const server of multiClient.listServers()) {
        const mcpLayer: McpLayer = {
          protocol: 'mcp',
          serverName: server.name,
          tools: fromMcpTools(server.tools as Parameters<typeof fromMcpTools>[0]),
          recipes: !recipesAttached && mcpRecipes.length > 0 ? mcpRecipes : undefined,
        };
        if (mcpLayer.recipes) recipesAttached = true;
        result.push(mcpLayer);
      }
    }
    result.push(autoui.layer());
    return result;
  });

  const effectivePrompt = $derived.by(() => {
    const base = buildSystemPrompt(layers);
    // Si l'utilisateur a customisé le prompt dans les settings, le préfixer
    const hasCustom = systemPrompt && systemPrompt.trim().length > 0;
    return hasCustom ? `${systemPrompt}\n\n${base}` : base;
  });

  const providerTools = $derived(buildToolsFromLayers(layers, { sanitize: schemaSanitize, flatten: schemaFlatten }));
  const discoveryCache = $derived(buildDiscoveryCache(layers));
  const diagnostics = $derived(runDiagnostics(layers, providerTools, effectivePrompt ?? '', { sanitize: schemaSanitize, flatten: schemaFlatten }));

  // ── Helpers ────────────────────────────────────────────────────────
  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function pushHistory(role: string, content: string) {
    historyLog = [...historyLog, { id: uid(), role, content, ts: new Date() }];
  }
  function updateEphemeral(id: string, html: string) {
    ephemeral = ephemeral.map(e => e.id === id ? { ...e, html } : e);
  }

  // ── HyperSkill export ─────────────────────────────────────────────
  async function exportHsUrl() {
    if (exportState === 'loading') return;
    exportState = 'loading';
    try {
      const skill = canvas.buildSkillJSON() as Record<string, unknown>;
      if (includeSummary && conversationHistory.length > 0) {
        try {
          const result = await summarizeChat({
            messages: conversationHistory, provider: getProvider(),
            toolsUsed: allToolsUsed, toolCallCount: chatToolCount,
            mcpServers: multiClient.listServers().map(s => s.name),
            skillsReferenced: skills.map(s => s.name),
          });
          skill.chatSummary = result.chatSummary;
          skill.provenance = result.provenance;
        } catch { /* don't block export */ }
      }
      const url = await encodeHyperSkill(skill as unknown as HyperSkill, window.location.origin + base);
      await navigator.clipboard.writeText(url);
      exportedUrl = url;
      // Build block summary
      const blocks = canvas.blocks;
      const typeSet = new Set(blocks.map(b => b.type));
      exportedBlockSummary = { count: blocks.length, types: [...typeSet] };
      exportState = 'done';
      exportCopied = true;
      // Open modal
      exportModalOpen = true;
      setTimeout(() => { exportState = 'idle'; exportCopied = false; }, 3000);
    } catch {
      exportState = 'idle';
    }
  }

  // ── Agent ──────────────────────────────────────────────────────────
  async function sendMessage(msg: string) {
    if (!msg.trim() || canvas.generating) return;
    input = '';
    ephemeral = [];
    allToolsUsed = [];
    agentLogs = [];
    toolCallDetails = new Map();
    pushHistory('user', msg);
    const userId = uid();
    ephemeral = [...ephemeral, { id: userId, role: 'user', html: msg }];
    const assistantId = uid();
    ephemeral = [...ephemeral, { id: assistantId, role: 'assistant', html: '...' }];

    canvas.setGenerating(true);
    chatTimer = 0; chatToolCount = 0; chatLastTool = '';
    let lastLoggedTextLen = 0;
    const timerInterval = setInterval(() => chatTimer++, 1000);
    abortController = new AbortController();

    // Resolve server name for provenance
    const currentServerName = canvas.mcpName ?? '';
    let result: Awaited<ReturnType<typeof runAgentLoop>> | null = null;

    try {
      result = await runAgentLoop(msg, {
        client: multiClient.hasConnections ? multiClient as any : undefined,
        provider: getProvider(),
        systemPrompt: effectivePrompt || undefined,
        maxIterations: 15, maxTokens, maxTools, maxResultLength, temperature, topK, cacheEnabled,
        truncateResults, compressHistory: compressHistory ? compressPreview : false,
        signal: abortController!.signal,
        initialMessages: trimConversationHistory(conversationHistory, maxContextTokens),
        layers,
        discoveryCache,
        schemaOptions: { sanitize: schemaSanitize, flatten: schemaFlatten },
        callbacks: {
          onIterationStart: (i, max) => {
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'iteration', detail: `Iteration ${i}/${max}` }];
            if (i === 1) {
              // Log the system prompt on first iteration
              agentLogs = [...agentLogs, { ts: Date.now(), type: 'prompt', detail: effectivePrompt ?? '(none)' }];
            }
          },
          onLLMRequest: (messages, tools) => {
            const ctxChars = messages.reduce((sum, m) => {
              if (typeof m.content === 'string') return sum + m.content.length;
              return sum + (m.content as any[]).reduce((s, b) => s + (b.text?.length ?? JSON.stringify(b).length ?? 0), 0);
            }, 0);
            const ctxTokens = Math.round(ctxChars / 4);
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'request', detail: `${messages.length} messages, ${tools.length} tools`, ctxSize: ctxTokens }];
          },
          onLLMResponse: (response, latencyMs, tokens) => {
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'response', detail: `${tokens?.input ?? '?'}in ${tokens?.output ?? '?'}out, ${Math.round(latencyMs)}ms, ${response.stopReason}`, ctxSize: tokens?.input }];
            if (response.usage) tokenTracker.record(response.usage, latencyMs);
            else if (response.stats) tokenTracker.recordEstimate(0, response.stats.totalTokens * 4, latencyMs);
          },
          onWidget: (type, data) => {
                const widget = flexGrid?.addBlock(type, data, currentServerName, type);
                return widget ? { id: widget.id } : undefined;
              },
          onClear: () => flexGrid?.clearBlocks(),
          onUpdate: (id, data) => bus.send('agent', id, 'data-update', data),
          onMove: (id, x, y) => layoutAdapter.move(id, x, y),
          onResize: (id, w, h) => layoutAdapter.resize(id, w, h),
          onStyle: (id, styles) => layoutAdapter.style(id, styles),
          onToken: () => {},
          onText: (text) => {
            if (text) {
              // Log text updates every ~50 chars to avoid spam
              if (text.length < 50 || text.length - lastLoggedTextLen > 50) {
                lastLoggedTextLen = text.length;
                agentLogs = [...agentLogs, { ts: Date.now(), type: 'text', detail: text }];
              }
              // Strip Gemma tool call tags from ephemeral display
              const clean = text.replace(/<\|tool_call>[\s\S]*?(<tool_call\|>)?/g, '').replace(/<\|tool_response>[\s\S]*?(<tool_response\|>)?/g, '').replace(/<\|"\|>/g, '').trim();
              if (clean) updateEphemeral(assistantId, clean);
            }
          },
          onToolCall: (call) => {
            chatToolCount++; chatLastTool = call.name;
            allToolsUsed = [...allToolsUsed, call.name];
            const tag = call.guided ? '[recette]' : '[impro]';
            const argsJson = JSON.stringify(call.args, null, 2);
            const resultFull = call.result ?? call.error ?? '';
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'tool', detail: `${tag} ${call.name}(${argsJson}) -> ${resultFull} [${call.elapsed ?? '?'}ms]` }];
            // Store full details for tooltip
            const callId = `tc_${Date.now()}_${chatToolCount}`;
            const detail: ToolCallDetail = {
              name: call.name,
              args: call.args ?? {},
              result: call.result,
              error: call.error,
              elapsed: call.elapsed,
            };
            const nextDetails = new Map(toolCallDetails);
            nextDetails.set(callId, detail);
            toolCallDetails = nextDetails;
            updateEphemeral(assistantId, `<strong>${call.name}</strong>`);
          },
          onDone: (metrics) => {
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'done', detail: `${metrics.iterations} iter, ${metrics.toolCalls} tools, ${metrics.totalTokens} tokens, ${Math.round(metrics.totalLatencyMs)}ms` }];
          },
        },
      });
      if (result) {
        conversationHistory = result.messages;
        if (result.text) { updateEphemeral(assistantId, result.text); pushHistory('assistant', result.text); }
      }
    } catch(e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      updateEphemeral(assistantId, errMsg);
      pushHistory('system', errMsg);
    } finally {
      clearInterval(timerInterval);
      abortController = null;
      canvas.setGenerating(false);
      // Keep ephemeral visible longer if no blocks were rendered (text-only response)
      const hasBlocks = result?.toolCalls?.some(c => c.name === 'autoui_webmcp_widget_display' || c.name?.startsWith('render_'));
      setTimeout(() => { ephemeral = []; }, hasBlocks ? 3000 : 15000);
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

  onMount(() => {
    const param = new URLSearchParams(window.location.search).get('hs');
    if (param) {
      canvas.loadFromParam(param).then((ok) => {
        if (!ok) return;
        // Sync FlexGrid windows from canvas blocks already loaded into the store
        flexGrid?.syncFromCanvas();
        if (canvas.mcpUrl) addMcpServer(canvas.mcpUrl);
      });
    }
    skills = listSkills();
  });

  onDestroy(() => {
    if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
  });
</script>

<svelte:head><title>Auto-UI flex2</title></svelte:head>

<div class="h-screen flex flex-col overflow-hidden bg-bg">

  <!-- TOPBAR -->
  <header class="h-12 flex items-center gap-3 px-4 border-b border-border bg-surface flex-shrink-0">
    <button class="flex items-center gap-2 text-text2 hover:text-text1 transition-colors flex-shrink-0"
            onclick={() => settingsOpen = true} aria-label="Parametres">
      <Menu size={18} />
      <span class="font-mono text-sm font-bold">
        <span class="text-text1">Auto-UI</span> <span class="text-accent">flex2</span>
      </span>
    </button>
    <TokenBubble metrics={tokenMetrics} visible={showTokens && composerMode} />
    <div class="flex-1"></div>

    {#if composerMode}
      <button class="flex items-center h-7 px-1.5 rounded border transition-all flex-shrink-0
                     {layoutMode === 'grid' ? 'border-accent bg-accent/10 text-accent' : 'border-border2 text-text2 hover:text-text1'}"
              onclick={() => layoutMode = layoutMode === 'float' ? 'grid' : 'float'}
              aria-label="Toggle layout" title={layoutMode === 'grid' ? 'Vue grille' : 'Vue flottante'}>
        <LayoutGrid size={14} />
      </button>
    {/if}
    <McpStatus
      connecting={canvas.mcpConnecting}
      connected={canvas.mcpConnected}
      name={canvas.mcpName ?? 'non connecte'}
      servers={multiClient.listServers().map(s => ({ url: s.url, name: s.name, toolCount: s.tools.length }))}
    />
    {#if gemmaStatus === 'ready'}
      <span class="font-mono text-[10px] text-teal flex items-center gap-1 flex-shrink-0">
        <span class="w-1.5 h-1.5 rounded-full bg-teal"></span>
        {({'gemma-e2b':'Gemma E2B','gemma-e4b':'Gemma E4B'} as Record<string,string>)[canvas.llm] ?? canvas.llm}
      </span>
    {/if}
    <button class="font-mono text-xs h-7 px-2 rounded border border-border2 text-text2 hover:text-text1 transition-all flex-shrink-0"
            onclick={toggleTheme} aria-label="Toggle theme">*</button>
  </header>

  <!-- GEMMA LOADER -->
  {#if gemmaStatus === 'loading' || gemmaStatus === 'error'}
    <GemmaLoader
      status={gemmaStatus} progress={gemmaProgress} elapsed={gemmaElapsed}
      loadedMB={gemmaLoadedMB} totalMB={gemmaTotalMB}
      modelName={({'gemma-e2b':'Gemma E2B','gemma-e4b':'Gemma E4B'} as Record<string,string>)[canvas.llm] ?? canvas.llm}
      onunload={unloadGemma}
    />
  {/if}

  <!-- CANVAS + EPHEMERAL -->
  <div class="flex-1 relative overflow-hidden">
    <FlexGrid bind:this={flexGrid} class="w-full h-full" {layoutMode} oninteract={handleWidgetInteraction} />

    {#if composerMode}
      <div class="absolute bottom-3 left-[50px] right-[50px] flex flex-col gap-2 pointer-events-none z-20">
        <EphemeralBubble {ephemeral} />
      </div>
    {/if}
  </div>

  <!-- LOG DRAWER (bottom, resizable) -->
  {#if composerMode}
    <LogDrawer open={showToolJSON} logs={agentLogs} onclear={() => agentLogs = []} />
  {/if}

  <!-- AGENT PROGRESS -->
  {#if composerMode}
    <AgentProgress active={canvas.generating} elapsed={chatTimer} toolCalls={chatToolCount} lastTool={chatLastTool} />
  {/if}

  <!-- INPUT BAR (composer only) -->
  {#if composerMode}
    <div class="flex-shrink-0 px-[50px] py-4 bg-surface border-t border-border">
      <div class="flex gap-2 items-center">
        <button
          class="relative flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg border transition-colors
                 {showToolJSON ? 'border-accent bg-accent/10 text-accent' : 'border-border2 text-text2 hover:text-text1'}"
          onclick={() => showToolJSON = !showToolJSON}
          aria-label="Toggle logs">
          <Terminal size={14} />
          {#if canvas.generating && agentLogs.length > 0}
            <span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-teal"></span>
          {/if}
        </button>
        <input type="text" bind:value={input} onkeydown={onKeydown}
          placeholder={canvas.mcpConnected ? `Demandez une interface sur ${canvas.mcpName}...` : 'Ouvrez le menu pour connecter un MCP...'}
          disabled={canvas.generating}
          class="flex-1 bg-surface2 border border-border2 rounded-xl px-5 py-3 text-sm font-mono text-text1
                 outline-none placeholder:text-text2/50 focus:border-accent/60 transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed" />
        {#if canvas.generating}
          <button class="px-4 py-3 rounded-xl bg-accent2/10 border border-accent2/30 text-accent2 font-mono text-sm hover:bg-accent2/20 transition-colors flex-shrink-0"
                  onclick={() => abortController?.abort()}>
            Stop
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- SETTINGS DRAWER -->
<!-- onconnect closure: safe because setMcpUrl is synchronous, so canvas.mcpUrl is always current -->
<SettingsDrawer
  bind:open={settingsOpen}
  bind:composerMode bind:layoutMode bind:includeSummary
  onexport={exportHsUrl} {exportState} onhistory={() => historyOpen = true}
  bind:mcpToken bind:systemPrompt {effectivePrompt} bind:maxTokens bind:maxContextTokens bind:maxTools bind:maxResultLength
  bind:cacheEnabled bind:temperature bind:topK bind:showTokens bind:showToolJSON
  bind:schemaSanitize bind:schemaFlatten bind:compressHistory bind:compressPreview
  bind:localUrl bind:localModel
  onconnect={() => addMcpServer(canvas.mcpUrl)}
  {connectedUrls} {loadingUrls}
  onaddserver={addMcpServer} onaddall={addAllServers} onremoveserver={removeMcpServer}
  {mcpRecipes}
  webmcpRecipes={(layers.find(l => l.protocol === 'webmcp') as any)?.recipes ?? []}
  {diagnostics}
/>

<!-- EXPORT MODAL -->
{#if exportModalOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-10"
       onclick={(e) => { if (e.target === e.currentTarget) exportModalOpen = false; }}>
    <div class="w-full max-w-xl bg-surface border border-border2 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
      <div class="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
        <span class="font-mono text-sm font-bold text-text1">Hyper-recette exportee</span>
        <div class="flex-1"></div>
        <button class="text-text2 hover:text-text1 font-mono text-base leading-none transition-colors"
                onclick={() => exportModalOpen = false}>x</button>
      </div>
      <div class="flex flex-col gap-4 p-6">
        <p class="font-mono text-xs text-text2 leading-relaxed">
          Cette Hyper-recette contient vos widgets, parametres et resume de conversation.
          Partagez ce lien pour que d'autres puissent reproduire votre session.
        </p>
        <div class="bg-surface2 border border-border2 rounded-lg p-3 break-all">
          <a href={exportedUrl} target="_blank" rel="noopener"
             class="font-mono text-[11px] text-accent hover:underline">{exportedUrl}</a>
        </div>
        {#if exportedBlockSummary.count > 0}
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono text-[10px] text-text2">{exportedBlockSummary.count} widget{exportedBlockSummary.count > 1 ? 's' : ''} inclus :</span>
            {#each exportedBlockSummary.types as t}
              <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono border border-accent/30 text-accent bg-accent/5">{t}</span>
            {/each}
          </div>
        {/if}
        <button class="font-mono text-xs h-8 px-4 rounded-lg border border-accent text-accent hover:bg-accent/10 transition-colors self-end"
                onclick={async () => { await navigator.clipboard.writeText(exportedUrl); }}>
          Copier le lien
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- HISTORY MODAL -->
<HistoryModal bind:open={historyOpen} messages={historyLog} />

<!-- DEBUG PANEL (Ctrl+Shift+D) -->
<DebugPanel prompt={effectivePrompt} {layers} />
