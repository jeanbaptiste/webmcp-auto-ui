<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { base } from '$app/paths';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { McpMultiClient } from '@webmcp-auto-ui/core';
  import type { WebMcpServer } from '@webmcp-auto-ui/core';
  import {
    RemoteLLMProvider, WasmProvider, LocalLLMProvider, runAgentLoop, buildSystemPrompt,
    fromMcpTools, trimConversationHistory, TokenTracker,
    buildToolsFromLayers, runDiagnostics, buildDiscoveryCache, ContextRAG,
  } from '@webmcp-auto-ui/agent';
  import type { ChatMessage, ToolLayer, McpLayer } from '@webmcp-auto-ui/agent';
  import {
    McpStatus, GemmaLoader, AgentProgress, EphemeralBubble,
    TokenBubble, LLMSelector, bus, layoutAdapter,
    FloatingLayout, FlexLayout, WidgetRenderer,
    LinkIndicators, linkGroupColor, RemoteMCPserversDemo,
    DiagnosticIcon, DiagnosticModal,
  } from '@webmcp-auto-ui/ui';
  import type { ManagedWindow } from '@webmcp-auto-ui/ui';
  import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';
  import { Settings, Terminal, LayoutGrid, X, ChevronLeft, ChevronRight } from 'lucide-svelte';
  import ServerSelector from '$lib/ServerSelector.svelte';
  import { ALL_PACKS, buildLayers, getActiveServers } from '$lib/agent-setup';

  // ── Server packs state ────────────────────────────────────────────
  let enabledPacks = $state<Set<string>>(new Set(['autoui']));

  let serverOptions = $derived(
    ALL_PACKS.map(p => ({
      id: p.id,
      label: p.label,
      description: p.description,
      enabled: enabledPacks.has(p.id),
    })),
  );

  function togglePack(id: string, enabled: boolean) {
    const next = new Set(enabledPacks);
    if (enabled) next.add(id);
    else next.delete(id);
    enabledPacks = next;
  }

  let activeServers = $derived<WebMcpServer[]>(getActiveServers(enabledPacks));

  // ── Core state ────────────────────────────────────────────────────
  let input = $state('');
  let mcpUrl = $state('');
  let mcpToken = $state('');
  let conversationHistory = $state<ChatMessage[]>([]);
  let ephemeral = $state<{id:string; role:'user'|'assistant'; html:string}[]>([]);
  let chatTimer = $state(0);
  let chatToolCount = $state(0);
  let chatLastTool = $state('');
  let maxContextTokens = $state(150_000);
  let maxTokens = $state(4096);
  let cacheEnabled = $state(true);
  let temperature = $state(1.0);
  let maxTools = $state(8);
  let maxResultLength = $state(10000);
  let truncateResults = $state(false);
  let compressHistory = $state(false);
  let compressPreview = $state(500);
  let schemaSanitize = $state(true);
  let schemaFlatten = $state(false);
  let localUrl = $state('http://localhost:11434');
  let localModel = $state('');
  let systemPrompt = $state('');
  let layoutMode = $state<'float' | 'grid'>('float');
  let sidebarOpen = $state(true);
  let showLogs = $state(false);

  // ── Nano-RAG (experimental, off by default) ──────────────────────
  let contextRAGEnabled = $state(false);
  let contextRAG = $state<ContextRAG | null>(null);

  $effect(() => {
    if (contextRAGEnabled && !contextRAG) {
      contextRAG = new ContextRAG({ topK: 5 });
    }
    if (!contextRAGEnabled && contextRAG) {
      contextRAG.destroy();
      contextRAG = null;
    }
  });

  // ── Token tracking ────────────────────────────────────────────────
  const tokenTracker = new TokenTracker();
  let tokenMetrics = $state(tokenTracker.metrics);
  tokenTracker.subscribe(m => { tokenMetrics = m; });

  let agentLogs = $state<{ ts: number; type: string; detail: string; ctxSize?: number }[]>([]);
  let abortController = $state<AbortController | null>(null);
  let allToolsUsed = $state<string[]>([]);

  // ── Widget grid ───────────────────────────────────────────────────
  let windows = $state<ManagedWindow[]>([]);
  let fl = $state<any>(null);

  $effect(() => {
    if (!fl) return;
    layoutAdapter.register({
      move:   (id, x, y) => fl?.move(id, x, y),
      resize: (id, w, h) => fl?.resize(id, w, h),
      style:  (id, styles) => {
        const el = document.querySelector(`[data-block-id="${id}"]`) as HTMLElement | null;
        if (el) for (const [k, v] of Object.entries(styles)) el.style.setProperty(`--color-${k}`, v);
      },
    });
  });

  onDestroy(() => layoutAdapter.unregister());

  function addBlock(type: string, data: Record<string, unknown>) {
    const block = canvas.addWidget(type as Parameters<typeof canvas.addBlock>[0], data);
    windows = [...windows, {
      id: block.id,
      title: type,
      visible: true,
      focused: true,
      folded: false,
      weight: 1,
      createdAt: Date.now(),
      lastFocusedAt: Date.now(),
    }];
    return block;
  }

  function clearBlocks() {
    windows = [];
    canvas.clearBlocks();
  }

  function closeBlock(id: string) {
    windows = windows.filter(w => w.id !== id);
    canvas.removeBlock(id);
  }

  /** Compute the left-border accent color for a linked widget. */
  function linkBorderStyle(widgetId: string): string {
    if (typeof (bus as any).hasLinks !== 'function') return '';
    if (!(bus as any).hasLinks(widgetId)) return '';
    const links = typeof (bus as any).getLinks === 'function' ? (bus as any).getLinks(widgetId) : [];
    if (!Array.isArray(links) || links.length === 0) return '';
    const first = links[0];
    const gid = typeof first === 'object' && first?.groupId ? String(first.groupId) : null;
    if (!gid) return '';
    return `border-left:3px solid ${linkGroupColor(gid)};`;
  }

  // ── Multi-MCP ─────────────────────────────────────────────────────
  let multiClient = $state<McpMultiClient>(new McpMultiClient());
  let connectedUrls = $state<string[]>([]);
  let loadingUrls = $state<string[]>([]);
  let mcpRecipes = $state<{name:string; description?:string; serverName?:string}[]>([]);

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
      if (tools.some(t => t.name === 'list_recipes')) {
        try {
          const r = await multiClient.callTool('list_recipes', {});
          const text = r.content?.find((c: any) => c.type === 'text') as any;
          if (text?.text) {
            const parsed = JSON.parse(text.text);
            const newRecipes: {name:string; description?:string}[] = Array.isArray(parsed) ? parsed : (parsed?.recipes ?? []);
            const serverName = multiClient.listServers().find(s => s.url === url.trim())?.name;
            mcpRecipes = [...mcpRecipes, ...newRecipes.map(rec => ({ ...rec, serverName }))];
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
    if (multiClient.serverCount === 0) {
      canvas.setMcpConnected(false, '', []);
    } else {
      const allTools = multiClient.listAllTools();
      canvas.setMcpConnected(true, multiClient.listServers().map(s => s.name).join(', '), allTools as Parameters<typeof canvas.setMcpConnected>[2]);
    }
  }

  async function addAllServers() {
    for (const server of MCP_DEMO_SERVERS) {
      await addMcpServer(server.url);
    }
  }

  // ── Gemma ─────────────────────────────────────────────────────────
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

  // ── Layers & prompt ───────────────────────────────────────────────
  const layers = $derived.by((): ToolLayer[] => {
    const result: ToolLayer[] = [];
    if (canvas.mcpConnected) {
      const mcpLayer: McpLayer = {
        protocol: 'mcp',
        serverName: canvas.mcpName ?? 'mcp',
        tools: fromMcpTools(canvas.mcpTools as Parameters<typeof fromMcpTools>[0]),
        recipes: mcpRecipes.length > 0 ? mcpRecipes : undefined,
      };
      result.push(mcpLayer);
    }
    // Add all enabled widget pack layers
    result.push(...buildLayers(enabledPacks));
    return result;
  });

  const effectivePrompt = $derived.by(() => {
    const b = buildSystemPrompt(layers);
    const hasCustom = systemPrompt && systemPrompt.trim().length > 0;
    return hasCustom ? `${systemPrompt}\n\n${b}` : b;
  });

  const providerTools = $derived(buildToolsFromLayers(layers, { sanitize: schemaSanitize, flatten: schemaFlatten }));
  const discoveryCache = $derived(buildDiscoveryCache(layers));
  const diagnostics = $derived(runDiagnostics(layers, providerTools, effectivePrompt ?? '', { sanitize: schemaSanitize, flatten: schemaFlatten }));
  let diagModalOpen = $state(false);

  // ── Helpers ────────────────────────────────────────────────────────
  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function updateEphemeral(id: string, html: string) {
    ephemeral = ephemeral.map(e => e.id === id ? { ...e, html } : e);
  }

  // ── Agent ─────────────────────────────────────────────────────────
  async function sendMessage(msg: string) {
    if (!msg.trim() || canvas.generating) return;
    input = '';
    ephemeral = [];
    allToolsUsed = [];
    agentLogs = [];
    const userId = uid();
    ephemeral = [...ephemeral, { id: userId, role: 'user', html: msg }];
    const assistantId = uid();
    ephemeral = [...ephemeral, { id: assistantId, role: 'assistant', html: '...' }];

    canvas.setGenerating(true);
    chatTimer = 0; chatToolCount = 0; chatLastTool = '';
    const timerInterval = setInterval(() => chatTimer++, 1000);
    abortController = new AbortController();

    let result: Awaited<ReturnType<typeof runAgentLoop>> | null = null;

    try {
      result = await runAgentLoop(msg, {
        client: multiClient.hasConnections ? multiClient as any : undefined,
        provider: getProvider(),
        systemPrompt: effectivePrompt || undefined,
        maxIterations: 15, maxTokens, maxTools, maxResultLength, temperature, cacheEnabled,
        truncateResults, compressHistory: compressHistory ? compressPreview : false,
        signal: abortController!.signal,
        initialMessages: trimConversationHistory(conversationHistory, maxContextTokens),
        layers,
        discoveryCache,
        contextRAG: contextRAG ?? undefined,
        schemaOptions: { sanitize: schemaSanitize, flatten: schemaFlatten },
        callbacks: {
          onIterationStart: (i, max) => {
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'iteration', detail: `Iteration ${i}/${max}` }];
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
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'response', detail: `${tokens?.input ?? '?'}in ${tokens?.output ?? '?'}out, ${Math.round(latencyMs)}ms`, ctxSize: tokens?.input }];
            if (response.usage) tokenTracker.record(response.usage, latencyMs);
          },
          onWidget: (type, data) => {
            const widget = addBlock(type, data);
            return widget ? { id: widget.id } : undefined;
          },
          onClear: () => clearBlocks(),
          onUpdate: (id, data) => bus.send('agent', id, 'data-update', data),
          onMove: (id, x, y) => layoutAdapter.move(id, x, y),
          onResize: (id, w, h) => layoutAdapter.resize(id, w, h),
          onStyle: (id, styles) => layoutAdapter.style(id, styles),
          onToken: () => {},
          onText: (text) => {
            if (text) {
              const clean = text.replace(/<\|tool_call>[\s\S]*?(<tool_call\|>)?/g, '').replace(/<\|tool_response>[\s\S]*?(<tool_response\|>)?/g, '').replace(/<\|"\|>/g, '').trim();
              if (clean) updateEphemeral(assistantId, clean);
            }
          },
          onToolCall: (call) => {
            chatToolCount++; chatLastTool = call.name;
            allToolsUsed = [...allToolsUsed, call.name];
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'tool', detail: `${call.name}(${JSON.stringify(call.args, null, 2)}) [${call.elapsed ?? '?'}ms]` }];
            updateEphemeral(assistantId, `<strong>${call.name}</strong>`);
          },
          onDone: (metrics) => {
            agentLogs = [...agentLogs, { ts: Date.now(), type: 'done', detail: `${metrics.iterations} iter, ${metrics.toolCalls} tools, ${metrics.totalTokens} tokens` }];
          },
        },
      });
      if (result) {
        conversationHistory = result.messages;
        if (result.text) updateEphemeral(assistantId, result.text);
      }
    } catch(e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      updateEphemeral(assistantId, errMsg);
    } finally {
      clearInterval(timerInterval);
      abortController = null;
      canvas.setGenerating(false);
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
    if (param) canvas.loadFromParam(param).then(() => { if (canvas.mcpUrl) addMcpServer(canvas.mcpUrl); });
  });

  onDestroy(() => {
    if (gemmaTimerInterval) { clearInterval(gemmaTimerInterval); gemmaTimerInterval = null; }
  });
</script>

<svelte:head><title>Auto-UI multi-svelte</title></svelte:head>

<div class="h-screen flex overflow-hidden bg-bg">

  <!-- SIDEBAR -->
  {#if sidebarOpen}
    <aside class="w-64 flex-shrink-0 flex flex-col border-r border-border bg-surface overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-3 border-b border-border">
        <span class="font-mono text-sm font-bold">
          <span class="text-text1">Auto-UI</span> <span class="text-accent">multi</span>
        </span>
        <button class="text-text2 hover:text-text1 transition-colors" onclick={() => sidebarOpen = false}
                aria-label="Close sidebar">
          <ChevronLeft size={16} />
        </button>
      </div>

      <!-- LLM Selector -->
      <div class="px-3 py-3 border-b border-border">
        <span class="text-[10px] uppercase tracking-wider text-text2 mb-2 block">Model</span>
        <LLMSelector
          value={canvas.llm}
          onchange={(v) => { canvas.setLlm(v as any); }}
          models={[
            { value: 'haiku', label: 'claude-haiku-4-5', group: 'remote' },
            { value: 'sonnet', label: 'claude-sonnet-4-6', group: 'remote' },
            { value: 'opus', label: 'claude-opus-4-6', group: 'remote' },
            { value: 'gemma-e2b', label: 'Gemma E2B (WASM)', group: 'wasm' },
            { value: 'gemma-e4b', label: 'Gemma E4B (WASM)', group: 'wasm' },
            { value: 'local', label: 'Local (Ollama/vLLM)', group: 'local' },
          ]}
        />
      </div>

      <!-- Local LLM config -->
      {#if canvas.llm === 'local'}
      <div class="px-3 py-3 border-b border-border">
        <span class="text-[10px] uppercase tracking-wider text-text2 mb-2 block">LLM local</span>
        <div class="flex flex-col gap-1.5">
          <input type="text" bind:value={localUrl} placeholder="http://localhost:11434"
            class="w-full bg-surface2 border border-border2 rounded px-2 py-1.5 text-xs font-mono text-text1
                   outline-none placeholder:text-text2/50 focus:border-accent/60 transition-colors" />
          <input type="text" bind:value={localModel} placeholder="llama3.2, qwen2.5, mistral..."
            class="w-full bg-surface2 border border-border2 rounded px-2 py-1.5 text-xs font-mono text-text1
                   outline-none placeholder:text-text2/50 focus:border-accent/60 transition-colors" />
          <div class="text-[9px] font-mono text-text2/60">
            Compatible Ollama, vLLM, LM Studio, llama.cpp
          </div>
        </div>
      </div>
      {/if}

      <!-- MCP Connection (URL manuelle) -->
      <div class="px-3 py-3 border-b border-border">
        <span class="text-[10px] uppercase tracking-wider text-text2 mb-2 block">Serveur MCP (URL manuelle)</span>
        <div class="flex flex-col gap-1.5">
          <input type="text" bind:value={mcpUrl} placeholder="wss://server.example/sse"
            class="w-full bg-surface2 border border-border2 rounded px-2 py-1.5 text-xs font-mono text-text1
                   outline-none placeholder:text-text2/50 focus:border-accent/60 transition-colors" />
          {#if mcpToken !== undefined}
            <input type="password" bind:value={mcpToken} placeholder="Token (optional)"
              class="w-full bg-surface2 border border-border2 rounded px-2 py-1.5 text-xs font-mono text-text1
                     outline-none placeholder:text-text2/50 focus:border-accent/60 transition-colors" />
          {/if}
          <button onclick={() => addMcpServer(mcpUrl)}
            disabled={!mcpUrl.trim() || loadingUrls.includes(mcpUrl)}
            class="w-full px-2 py-1.5 rounded bg-accent/10 border border-accent/30 text-accent font-mono text-xs
                   hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {loadingUrls.includes(mcpUrl) ? 'Connecting...' : 'Connect'}
          </button>
        </div>
        {#if connectedUrls.length > 0}
          <div class="mt-2 flex flex-col gap-1">
            {#each connectedUrls as url (url)}
              <div class="flex items-center gap-1 text-[10px] font-mono text-teal">
                <span class="w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0"></span>
                <span class="truncate flex-1">{url}</span>
                <button class="text-text2 hover:text-accent2 transition-colors flex-shrink-0"
                        onclick={() => removeMcpServer(url)}>
                  <X size={10} />
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Serveurs MCP démo -->
      <div class="px-3 py-3 border-b border-border">
        <RemoteMCPserversDemo
          servers={MCP_DEMO_SERVERS}
          connectedUrls={connectedUrls}
          loading={loadingUrls}
          onconnect={addMcpServer}
          onconnectall={addAllServers}
          ondisconnect={removeMcpServer}
        />
      </div>

      <!-- Server Selector -->
      <div class="px-3 py-3 border-b border-border">
        <ServerSelector servers={serverOptions} onchange={togglePack} />
      </div>

      <!-- Settings -->
      <div class="px-3 py-3 flex flex-col gap-2">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] uppercase tracking-wider text-text2">Settings</span>
          <DiagnosticIcon count={diagnostics.length} onclick={() => diagModalOpen = true} />
        </div>
        <label class="flex items-center justify-between text-xs font-mono text-text2">
          <span>Max tokens</span>
          <input type="number" bind:value={maxTokens} min={256} max={16384} step={256}
            class="w-16 bg-surface2 border border-border2 rounded px-1 py-0.5 text-xs text-text1 text-right outline-none" />
        </label>
        <label class="flex items-center justify-between text-xs font-mono text-text2">
          <span>Max tools</span>
          <input type="number" bind:value={maxTools} min={1} max={30} step={1}
            class="w-16 bg-surface2 border border-border2 rounded px-1 py-0.5 text-xs text-text1 text-right outline-none" />
        </label>
        <label class="flex items-center justify-between text-xs font-mono text-text2">
          <span>Temperature</span>
          <input type="number" bind:value={temperature} min={0} max={2} step={0.1}
            class="w-16 bg-surface2 border border-border2 rounded px-1 py-0.5 text-xs text-text1 text-right outline-none" />
        </label>
        <label class="flex items-center gap-2 text-xs font-mono text-text2">
          <input type="checkbox" bind:checked={cacheEnabled} class="accent-accent" />
          <span>Prompt cache</span>
        </label>
        <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
          <input type="checkbox" bind:checked={contextRAGEnabled} class="accent-accent w-3.5 h-3.5" />
          Nano-RAG <span class="text-[8px] text-text2/40">(experimental)</span>
        </label>
      </div>

      <!-- Custom system prompt -->
      <div class="px-3 py-3 border-t border-border mt-auto">
        <span class="text-[10px] uppercase tracking-wider text-text2 mb-1 block">System prompt (prefix)</span>
        <textarea bind:value={systemPrompt} rows={3} placeholder="Custom instructions..."
          class="w-full bg-surface2 border border-border2 rounded px-2 py-1.5 text-xs font-mono text-text1
                 outline-none placeholder:text-text2/50 focus:border-accent/60 transition-colors resize-y" />
        {#if effectivePrompt}
          <details class="mt-2">
            <summary class="text-[10px] uppercase tracking-wider text-text2 cursor-pointer hover:text-text1 transition-colors">
              Prompt effectif ({effectivePrompt.length} chars)
            </summary>
            <pre class="mt-1 max-h-32 overflow-auto text-[10px] font-mono text-text2 bg-surface2 border border-border2 rounded p-2 whitespace-pre-wrap break-words">{effectivePrompt}</pre>
          </details>
        {/if}
      </div>
    </aside>
  {/if}

  <!-- MAIN -->
  <div class="flex-1 flex flex-col overflow-hidden">

    <!-- TOPBAR -->
    <header class="h-10 flex items-center gap-3 px-4 border-b border-border bg-surface flex-shrink-0">
      {#if !sidebarOpen}
        <button class="text-text2 hover:text-text1 transition-colors" onclick={() => sidebarOpen = true}
                aria-label="Open sidebar">
          <ChevronRight size={16} />
        </button>
      {/if}
      <TokenBubble metrics={tokenMetrics} visible={true} />
      <div class="flex-1"></div>
      <button class="flex items-center h-7 px-1.5 rounded border transition-all flex-shrink-0
                     {layoutMode === 'grid' ? 'border-accent bg-accent/10 text-accent' : 'border-border2 text-text2 hover:text-text1'}"
              onclick={() => layoutMode = layoutMode === 'float' ? 'grid' : 'float'}
              aria-label="Toggle layout" title={layoutMode === 'grid' ? 'Grid view' : 'Float view'}>
        <LayoutGrid size={14} />
      </button>
      <McpStatus
        connecting={canvas.mcpConnecting}
        connected={canvas.mcpConnected}
        name={canvas.mcpName ?? 'not connected'}
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

    <!-- CANVAS -->
    <div class="flex-1 relative overflow-hidden">
      {#if layoutMode === 'grid'}
        <FlexLayout {windows} minWidth={260} maxWidth={600}>
          {#snippet children(win, _lw, _ctx)}
            {@const block = canvas.blocks.find(b => b.id === win.id)}
            <div class="relative flex flex-col h-full bg-surface rounded-lg border border-border overflow-hidden"
                 data-block-id={win.id}>
              <div class="flex items-center gap-2 px-3 py-1.5 bg-surface2/50 border-b border-border shrink-0 select-none"
                   style={linkBorderStyle(win.id)}>
                <span class="text-[10px] font-mono text-text2 flex-1 truncate">{win.title}</span>
                <LinkIndicators busId={win.id} />
                <!-- svelte-ignore a11y_consider_explicit_label -->
                <button class="w-4 h-4 text-text2 hover:text-accent2 text-sm leading-none transition-colors flex-shrink-0"
                        onclick={(e) => { e.stopPropagation(); closeBlock(win.id); }}>x</button>
              </div>
              <div class="flex-1 overflow-auto min-h-0">
                {#if block}
                  <WidgetRenderer type={block.type} data={block.data} id={block.id} servers={activeServers} />
                {/if}
              </div>
            </div>
          {/snippet}
        </FlexLayout>
      {:else}
        <FloatingLayout bind:this={fl} {windows} defaultWidth={380} defaultHeight={280}>
          {#snippet children(win, _lw, ctx)}
            {@const block = canvas.blocks.find(b => b.id === win.id)}
            <div class="relative flex flex-col h-full bg-surface rounded-lg border border-border overflow-hidden"
                 data-block-id={win.id}>
              <div class="flex items-center gap-2 px-3 py-1.5 bg-surface2/50 border-b border-border shrink-0 cursor-move select-none"
                   style={linkBorderStyle(win.id)}
                   onmousedown={(e) => ctx.ondragstart(e)}
                   ondblclick={() => ctx.ontogglecollapse()}>
                <span class="text-[10px] font-mono text-text2 flex-1 truncate">{win.title}</span>
                <LinkIndicators busId={win.id} />
                <!-- svelte-ignore a11y_consider_explicit_label -->
                <button class="w-4 h-4 text-text2 hover:text-accent text-sm leading-none transition-colors flex-shrink-0"
                        onclick={(e) => { e.stopPropagation(); ctx.onfittocontent(); }}
                        title="Fit to content">&#x2922;</button>
                <!-- svelte-ignore a11y_consider_explicit_label -->
                <button class="w-4 h-4 text-text2 hover:text-accent2 text-sm leading-none transition-colors flex-shrink-0"
                        onclick={(e) => { e.stopPropagation(); closeBlock(win.id); }}>x</button>
              </div>
              {#if !ctx.collapsed}
                <div class="flex-1 overflow-auto min-h-0">
                  {#if block}
                    <WidgetRenderer type={block.type} data={block.data} id={block.id} servers={activeServers} />
                  {/if}
                </div>
              {/if}
              <!-- resize handled by FloatingLayout -->
            </div>
          {/snippet}
        </FloatingLayout>
      {/if}

      <!-- Ephemeral bubbles -->
      <div class="absolute bottom-3 left-[50px] right-[50px] flex flex-col gap-2 pointer-events-none z-20">
        <EphemeralBubble {ephemeral} />
      </div>
    </div>

    <!-- AGENT PROGRESS -->
    <AgentProgress active={canvas.generating} elapsed={chatTimer} toolCalls={chatToolCount} lastTool={chatLastTool} />

    <!-- LOG PANEL (collapsible) -->
    {#if showLogs && agentLogs.length > 0}
      <div class="max-h-40 overflow-y-auto border-t border-border bg-surface2 px-4 py-2 flex-shrink-0">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] uppercase tracking-wider text-text2">Agent Logs</span>
          <button class="text-[10px] text-text2 hover:text-text1" onclick={() => agentLogs = []}>Clear</button>
        </div>
        {#each agentLogs as log}
          <div class="text-[10px] font-mono text-text2 truncate">
            <span class="text-text2/60">{new Date(log.ts).toLocaleTimeString()}</span>
            <span class="text-accent">[{log.type}]</span>
            {log.detail}
          </div>
        {/each}
      </div>
    {/if}

    <!-- INPUT BAR -->
    <div class="flex-shrink-0 px-4 py-3 bg-surface border-t border-border">
      <div class="flex gap-2 items-center">
        <button
          class="relative flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg border transition-colors
                 {showLogs ? 'border-accent bg-accent/10 text-accent' : 'border-border2 text-text2 hover:text-text1'}"
          onclick={() => showLogs = !showLogs}
          aria-label="Toggle logs">
          <Terminal size={14} />
          {#if canvas.generating && agentLogs.length > 0}
            <span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-teal"></span>
          {/if}
        </button>
        <input type="text" bind:value={input} onkeydown={onKeydown}
          placeholder={canvas.mcpConnected ? `Ask for an interface on ${canvas.mcpName}...` : 'Connect an MCP server or just chat...'}
          disabled={canvas.generating}
          class="flex-1 bg-surface2 border border-border2 rounded-xl px-4 py-2.5 text-sm font-mono text-text1
                 outline-none placeholder:text-text2/50 focus:border-accent/60 transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed" />
        {#if canvas.generating}
          <button class="px-3 py-2.5 rounded-xl bg-accent2/10 border border-accent2/30 text-accent2 font-mono text-sm hover:bg-accent2/20 transition-colors flex-shrink-0"
                  onclick={() => abortController?.abort()}>
            Stop
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>

<DiagnosticModal bind:open={diagModalOpen} {diagnostics} onclose={() => diagModalOpen = false} />
