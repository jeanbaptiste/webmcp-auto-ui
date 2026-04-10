<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';
  import { BlockRenderer, getTheme, LLMSelector, GemmaLoader, AgentProgress, McpStatus } from '@webmcp-auto-ui/ui';
  import { PRESETS, type ThemePreset } from '$lib/themes';
  import { SIMPLE_BLOCKS, RICH_BLOCKS } from '$lib/demo-data';
  import { agentStore } from '$lib/agent-store.svelte';

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
  let selectedServerUrl = $state(MCP_DEMO_SERVERS[0]?.url ?? '');

  function onLlmChange(llm: string) {
    canvas.setLLM(llm as Parameters<typeof canvas.setLLM>[0]);
    untrack(() => agentStore.initGemma());
  }

  async function handleGenerate() {
    if (!selectedServerUrl) return;
    mode = 'agent';
    agentStore.clearBlocks();
    await agentStore.connect(selectedServerUrl);
    if (agentStore.connectError) return;
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

  onMount(() => {
    selectPreset(activePreset);
    // Default LLM
    canvas.setLLM('haiku');
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
            Agent — {displayBlocks.length} blocks — {activePreset.label}
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
    </div>
  </header>

  <!-- Agent Controls Bar -->
  <div class="border-b border-border bg-surface/50 backdrop-blur-sm">
    <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
      <!-- MCP Server Selector -->
      <div class="flex items-center gap-2">
        <label class="text-[10px] font-mono text-text2 uppercase tracking-widest">MCP</label>
        <select
          class="bg-surface2 border border-border2 rounded-lg px-3 py-1.5 text-xs font-mono text-text1
                 outline-none focus:border-accent/60 transition-colors min-w-[200px]"
          bind:value={selectedServerUrl}
          disabled={agentStore.generating}
        >
          {#each MCP_DEMO_SERVERS as server}
            <option value={server.url}>{server.name}</option>
          {/each}
        </select>
      </div>

      <!-- LLM Selector -->
      <div class="flex items-center gap-2">
        <label class="text-[10px] font-mono text-text2 uppercase tracking-widest">LLM</label>
        <LLMSelector value={canvas.llm} onchange={onLlmChange} class="text-xs" />
      </div>

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
          servers={agentStore.multiClient.listServers().map(s => ({ url: s.url, name: s.name, toolCount: s.tools.length }))}
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
    <GemmaLoader
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
            {displayBlocks.length} blocks — {agentStore.toolCallCount} tool calls — {agentStore.elapsed}s
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
                <BlockRenderer type={block.type} data={block.data} />
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
                  <BlockRenderer type={block.type} data={block.data} />
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
      <!-- ═══ Static demo blocks ═══ -->
      <section class="mb-12">
        <h2 class="text-sm font-mono text-text2 uppercase tracking-widest mb-6 border-b border-border pb-2">
          Simple Blocks
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {#each SIMPLE_BLOCKS as block}
            <div class="bg-surface border border-border rounded-lg overflow-hidden">
              <div class="bg-surface2 px-3 py-1.5 border-b border-border">
                <span class="text-[10px] font-mono text-text2 uppercase tracking-widest">{block.label}</span>
                <code class="text-[10px] font-mono text-accent ml-2">type="{block.type}"</code>
              </div>
              <BlockRenderer type={block.type} data={block.data} />
            </div>
          {/each}
        </div>
      </section>

      <section>
        <h2 class="text-sm font-mono text-text2 uppercase tracking-widest mb-6 border-b border-border pb-2">
          Rich Blocks
        </h2>
        <div class="flex flex-col gap-6">
          {#each RICH_BLOCKS as block}
            <div class="bg-surface border border-border rounded-lg overflow-hidden">
              <div class="bg-surface2 px-3 py-1.5 border-b border-border flex items-center gap-2">
                <span class="text-[10px] font-mono text-text2 uppercase tracking-widest">{block.label}</span>
                <code class="text-[10px] font-mono text-accent">type="{block.type}"</code>
              </div>
              <div class="p-4">
                <BlockRenderer type={block.type} data={block.data} />
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  </main>

  <!-- Footer -->
  <footer class="border-t border-border py-6 mt-12">
    <div class="max-w-7xl mx-auto px-4 text-center">
      <p class="text-xs font-mono text-text2">
        {#if displayBlocks}
          WebMCP Auto-UI — {displayBlocks.length} agent-generated blocks — {activePreset.label}
        {:else}
          WebMCP Auto-UI — {SIMPLE_BLOCKS.length + RICH_BLOCKS.length} components — 3 themes
        {/if}
      </p>
    </div>
  </footer>
</div>
