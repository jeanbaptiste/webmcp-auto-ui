<script lang="ts">
  declare const __BUILD_TIME__: string;
  declare const __GIT_HASH__: string;

  import { onMount, untrack } from 'svelte';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { REMOTE_MCP_REGISTRY } from '@webmcp-auto-ui/sdk';
  import { WidgetRenderer, getTheme, LLMSelector, ModelLoader, AgentProgress, McpStatus, HeaderControls, MCPserversList, WebMCPserversList } from '@webmcp-auto-ui/ui';
  import { autoui } from '@webmcp-auto-ui/agent';
  import {
    WEBMCP_SERVER_REGISTRY,
    WEBMCP_CATEGORY_ORDER,
    WEBMCP_CATEGORY_LABELS,
  } from '@webmcp-auto-ui/servers';
  import { PRESETS, type ThemePreset } from '$lib/themes';
  import { extractSampleFromRecipe } from '$lib/recipe-sample';
  import { agentStore } from '$lib/agent-store.svelte';

  // WebMCP servers — autoui (built-in) + 29 third-party packs
  const WEBMCP_REGISTRY = [
    { id: 'autoui', label: 'Auto-UI (natif)', description: 'Widgets natifs WebMCP (stat, table, galerie, timeline...)', category: 'generic' as const, server: autoui },
    ...WEBMCP_SERVER_REGISTRY,
  ];
  const webmcpServerList = WEBMCP_REGISTRY.map(s => ({
    id: s.id, label: s.label, description: s.description, category: s.category,
    widgetCount: s.server.listWidgets().length,
  }));
  const webmcpCategories = WEBMCP_CATEGORY_ORDER.map(key => ({ key, label: WEBMCP_CATEGORY_LABELS[key] }));

  function toggleWebmcpServer(id: string) {
    const next = new Set(canvas.enabledServerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    canvas.setEnabledServers([...next]);
  }
  const enabledWebmcpServers = $derived(new Set(canvas.enabledServerIds));

  const theme = getTheme();

  // ── Theme ────────────────────────────────────────────────────────────────
  let activePreset = $state<ThemePreset>(PRESETS[0]);

  function selectPreset(preset: ThemePreset) {
    activePreset = preset;
    theme.setMode(preset.mode);
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      for (const [key, value] of Object.entries(preset.overrides)) {
        root.style.setProperty(`--${key}`, value as string);
      }
    }
  }

  // ── Mode: demo (static) vs agent (generated) ────────────────────────────
  let mode = $state<'demo' | 'agent'>('demo');
  let selectedServerUrl = $state(REMOTE_MCP_REGISTRY[0]?.url ?? '');

  function onLlmChange(llm: string) {
    canvas.setLlm(llm as Parameters<typeof canvas.setLlm>[0]);
    agentStore.applySmartDefaults();
    untrack(() => agentStore.initGemma());
  }

  async function handleGenerate() {
    if (!selectedServerUrl) return;
    mode = 'agent';
    agentStore.clearBlocks();
    if (agentStore.connectedUrl !== selectedServerUrl) {
      await agentStore.connect(selectedServerUrl);
      if (agentStore.connectError) return;
    }
    await agentStore.generate();
  }

  function switchToDemo() {
    mode = 'demo';
    agentStore.clearBlocks();
    agentStore.disconnect();
  }

  // ── Derive display blocks ────────────────────────────────────────────────
  const displayBlocks = $derived(
    mode === 'agent' && agentStore.generatedBlocks.length > 0
      ? agentStore.generatedBlocks
      : null
  );

  // ── Demo mode: enabled WebMCP servers + sample data extracted from recipes ──
  const enabledServersList = $derived(
    WEBMCP_REGISTRY.filter(s => enabledWebmcpServers.has(s.id)),
  );

  type DemoServerGroup = {
    id: string;
    label: string;
    server: typeof WEBMCP_REGISTRY[number]['server'];
    widgets: { name: string; sample: Record<string, unknown> }[];
    skipped: number;
  };
  const demoGroups = $derived<DemoServerGroup[]>(
    enabledServersList.map(s => {
      const widgets: { name: string; sample: Record<string, unknown> }[] = [];
      let skipped = 0;
      for (const w of s.server.listWidgets()) {
        const sample = extractSampleFromRecipe(w.recipe);
        if (sample) widgets.push({ name: w.name, sample });
        else skipped++;
      }
      return { id: s.id, label: s.label, server: s.server, widgets, skipped };
    }),
  );
  const demoServersForRenderer = $derived(enabledServersList.map(s => s.server));
  const demoTotalWidgets = $derived(
    demoGroups.reduce((acc, g) => acc + g.widgets.length, 0),
  );

  onMount(() => {
    selectPreset(activePreset);
    // Default LLM
    canvas.setLlm('haiku');
  });
</script>

<svelte:head>
  <title>WebMCP Auto-UI — Component Showcase</title>
</svelte:head>

<div class="min-h-screen pb-20">
  <!-- Header -->
  <header class="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-lg font-bold text-text1 font-mono tracking-tight">WebMCP Auto-UI</h1>
        <p class="text-xs text-text2 font-mono">
          {#if mode === 'agent' && displayBlocks}
            Agent — {displayBlocks.length} widgets — {activePreset.label}
          {:else}
            Component Showcase — {activePreset.label}
          {/if}
        </p>
      </div>

      <!-- Theme Switcher -->
      <div class="flex items-center gap-1.5 bg-surface border border-border rounded-lg p-1">
        {#each PRESETS as preset}
          <button
            class="text-xs font-mono px-3 py-1.5 rounded-md transition-all
              {activePreset.id === preset.id
                ? 'bg-accent text-white shadow-sm'
                : 'text-text2 hover:text-text1 hover:bg-surface2'}"
            onclick={() => selectPreset(preset)}
          >
            {preset.label}
          </button>
        {/each}
      </div>

      <div class="flex items-center gap-2">
        <a href="https://github.com/jeanbaptiste/webmcp-auto-ui/tree/main/apps/showcase"
           target="_blank" rel="noopener"
           class="text-xs font-mono text-text2 hover:text-text1 transition-colors">GitHub</a>
        <HeaderControls />
      </div>
    </div>
  </header>

  <!-- Available servers (MCP remote + WebMCP local) -->
  <div class="border-b border-border bg-surface/30">
    <div class="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3">
      <details class="group">
        <summary class="flex items-center gap-1 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
          <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">MCP servers</span>
          <span class="text-[9px] text-text2/60 font-mono">({agentStore.connectedUrl ? 1 : 0}/{REMOTE_MCP_REGISTRY.length})</span>
          <span class="text-[10px] text-text2 ml-auto transition-transform group-open:rotate-90">&#x25B6;</span>
        </summary>
        <div class="mt-2">
          <MCPserversList
            servers={REMOTE_MCP_REGISTRY}
            enabledServers={new Set(canvas.dataServers.filter(s => s.connected).map(s => s.name))}
            loading={new Set(canvas.dataServers.filter(s => s.connecting).map(s => s.name))}
            onconnect={(id) => {
              const reg = REMOTE_MCP_REGISTRY.find(r => r.id === id);
              if (!reg) return;
              selectedServerUrl = reg.url;
              agentStore.connect(reg.url);
            }}
            ondisconnect={() => agentStore.disconnect()}
            hideHeader
          />
        </div>
      </details>

      <WebMCPserversList
        servers={webmcpServerList}
        enabledServers={enabledWebmcpServers}
        onToggle={toggleWebmcpServer}
        categories={webmcpCategories}
      />
    </div>
  </div>

  <!-- Agent Controls Bar -->
  <div class="border-b border-border bg-surface/50 backdrop-blur-sm">
    <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
      <!-- LLM Selector -->
      <div class="flex items-center gap-2">
        <label class="text-[10px] font-mono text-text2 uppercase tracking-widest">LLM</label>
        <LLMSelector value={canvas.llm} onchange={onLlmChange} class="text-xs" />
      </div>

      <!-- Nano-RAG toggle -->
      <label class="flex items-center gap-1.5 font-mono text-xs text-text2 cursor-pointer">
        <input type="checkbox" checked={agentStore.contextRAGEnabled}
               onchange={(e) => { agentStore.contextRAGEnabled = (e.target as HTMLInputElement).checked; }}
               class="accent-accent w-3.5 h-3.5" />
        Nano-RAG <span class="text-[8px] text-text2/40">(exp.)</span>
      </label>

      <!-- Generate / Stop / Demo buttons -->
      <div class="flex items-center gap-2 ml-auto">
        {#if agentStore.generating}
          <button
            class="px-4 py-1.5 rounded-lg bg-accent2/10 border border-accent2/30 text-accent2
                   font-mono text-xs hover:bg-accent2/20 transition-colors"
            onclick={() => agentStore.stop()}
          >
            Stop
          </button>
        {:else}
          <button
            class="px-4 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent
                   font-mono text-xs hover:bg-accent/20 transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed"
            onclick={handleGenerate}
            disabled={agentStore.connecting}
          >
            {agentStore.connecting ? 'Connecting...' : 'Generate'}
          </button>
        {/if}

        {#if mode === 'agent'}
          <button
            class="px-3 py-1.5 rounded-lg border border-border2 text-text2
                   font-mono text-xs hover:text-text1 hover:bg-surface2 transition-colors"
            onclick={switchToDemo}
          >
            Demo mode
          </button>
        {/if}
      </div>

      <!-- MCP Status -->
      {#if agentStore.connectedUrl}
        <McpStatus
          connecting={agentStore.connecting}
          connected={!!agentStore.connectedUrl}
          name={canvas.mcpName ?? ''}
          servers={canvas.dataServers.filter(s => s.connected).map(s => ({ url: s.url, name: s.serverName ?? s.label ?? s.name, toolCount: (s.tools ?? []).length }))}
        />
      {/if}
    </div>

    <!-- Connection error -->
    {#if agentStore.connectError}
      <div class="max-w-7xl mx-auto px-4 pb-2">
        <p class="text-xs font-mono text-accent2">{agentStore.connectError}</p>
      </div>
    {/if}
  </div>

  <!-- Gemma Loader -->
  {#if agentStore.gemmaStatus === 'loading' || agentStore.gemmaStatus === 'error'}
    <ModelLoader
      status={agentStore.gemmaStatus}
      progress={agentStore.gemmaProgress}
      elapsed={agentStore.gemmaElapsed}
      loadedMB={agentStore.gemmaLoadedMB}
      totalMB={agentStore.gemmaTotalMB}
      modelName={({'gemma-e2b':'Gemma E2B','gemma-e4b':'Gemma E4B'} as Record<string,string>)[canvas.llm] ?? canvas.llm}
      onunload={() => agentStore.unloadGemma()}
    />
  {/if}

  <!-- Agent Progress -->
  <AgentProgress
    active={agentStore.generating}
    elapsed={agentStore.elapsed}
    toolCalls={agentStore.toolCallCount}
    lastTool={agentStore.lastToolName}
  />

  <main class="max-w-7xl mx-auto px-4 py-8">
    {#if displayBlocks}
      <!-- ═══ Agent-generated blocks ═══ -->
      <section>
        <div class="flex items-center justify-between mb-6 border-b border-border pb-2">
          <h2 class="text-sm font-mono text-text2 uppercase tracking-widest">
            Generated from {canvas.mcpName ?? 'MCP'}
          </h2>
          <span class="text-[10px] font-mono text-text2">
            {displayBlocks.length} widgets — {agentStore.toolCallCount} tool calls — {agentStore.elapsed}s
          </span>
        </div>

        <!-- Simple blocks (stat, alert, text, code, tags, actions, list, kv, chart) -->
        {#if true}
        {@const simpleTypes = new Set(['stat', 'kv', 'list', 'chart', 'alert', 'code', 'text', 'actions', 'tags'])}
        {@const simples = displayBlocks.filter(b => simpleTypes.has(b.type))}
        {@const richs = displayBlocks.filter(b => !simpleTypes.has(b.type))}

        {#if simples.length > 0}
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {#each simples as block (block.id)}
              <div class="bg-surface border border-border rounded-lg overflow-hidden">
                <div class="bg-surface2 px-3 py-1.5 border-b border-border">
                  <span class="text-[10px] font-mono text-text2 uppercase tracking-widest">{block.label}</span>
                  <code class="text-[10px] font-mono text-accent ml-2">type="{block.type}"</code>
                </div>
                <WidgetRenderer type={block.type} data={block.data} />
              </div>
            {/each}
          </div>
        {/if}

        {#if richs.length > 0}
          <div class="flex flex-col gap-6">
            {#each richs as block (block.id)}
              <div class="bg-surface border border-border rounded-lg overflow-hidden">
                <div class="bg-surface2 px-3 py-1.5 border-b border-border flex items-center gap-2">
                  <span class="text-[10px] font-mono text-text2 uppercase tracking-widest">{block.label}</span>
                  <code class="text-[10px] font-mono text-accent">type="{block.type}"</code>
                </div>
                <div class="p-4">
                  <WidgetRenderer type={block.type} data={block.data} />
                </div>
              </div>
            {/each}
          </div>
        {/if}
        {/if}
      </section>

      <!-- Agent status -->
      {#if agentStore.agentStatus && !agentStore.generating}
        <div class="mt-6 text-center">
          <p class="text-xs font-mono text-text2">{agentStore.agentStatus}</p>
        </div>
      {/if}

    {:else}
      <!-- ═══ Demo blocks: every enabled WebMCP server's widgets, sampled from recipes ═══ -->
      {#if demoGroups.length === 0}
        <section class="text-center py-16">
          <p class="text-xs font-mono text-text2">
            No WebMCP server enabled. Toggle one above to see its widgets.
          </p>
        </section>
      {/if}

      {#each demoGroups as group (group.id)}
        <section class="mb-12">
          <div class="flex items-baseline justify-between mb-6 border-b border-border pb-2">
            <h2 class="text-sm font-mono text-text2 uppercase tracking-widest">
              {group.label}
            </h2>
            <span class="text-[10px] font-mono text-text2/60">
              {group.widgets.length} widgets{group.skipped > 0 ? ` · ${group.skipped} skipped` : ''}
            </span>
          </div>

          {#if group.widgets.length === 0}
            <p class="text-xs font-mono text-text2/60 italic">
              No sample data available for this server's widgets.
            </p>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {#each group.widgets as w (group.id + '/' + w.name)}
                <div class="bg-surface border border-border rounded-lg overflow-hidden">
                  <div class="bg-surface2 px-3 py-1.5 border-b border-border flex items-center gap-2">
                    <span class="text-[10px] font-mono text-text2 uppercase tracking-widest">{w.name}</span>
                    <code class="text-[10px] font-mono text-accent">type="{w.name}"</code>
                  </div>
                  <div class="p-4">
                    <WidgetRenderer type={w.name} data={w.sample} servers={demoServersForRenderer} />
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/each}
    {/if}
  </main>

  <!-- Footer -->
  <footer class="border-t border-border py-6 mt-12">
    <div class="max-w-7xl mx-auto px-4 text-center flex flex-col items-center gap-1">
      <p class="text-xs font-mono text-text2">
        {#if displayBlocks}
          WebMCP Auto-UI — {displayBlocks.length} agent-generated widgets — {activePreset.label}
        {:else}
          WebMCP Auto-UI — {demoTotalWidgets} widgets across {demoGroups.length} server{demoGroups.length === 1 ? '' : 's'} — 3 themes
        {/if}
      </p>
      <span class="font-mono text-[8px] text-text2/40">v{__APP_VERSION__} · {__GIT_HASH__ ?? ''} · {__BUILD_TIME__?.replace('T', ' ').replace('Z', '').slice(0, 23)}</span>
    </div>
  </footer>
</div>
