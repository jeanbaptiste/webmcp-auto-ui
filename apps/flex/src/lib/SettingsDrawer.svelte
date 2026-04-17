<script lang="ts" module>
  declare const __BUILD_TIME__: string;
  declare const __GIT_HASH__: string;
  declare const __APP_VERSION__: string;
</script>

<script lang="ts">
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';
  import { McpConnector, LLMSelector, SettingsPanel, RemoteMCPserversDemo, DiagnosticModal, DiagnosticIcon } from '@webmcp-auto-ui/ui';

  const buildStamp = typeof __BUILD_TIME__ === 'string'
    ? __BUILD_TIME__.replace('T', ' ').replace('Z', '').slice(0, 23) : '';
  const gitHash = typeof __GIT_HASH__ === 'string' ? __GIT_HASH__ : '';
  const appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '?';

  interface McpRecipe { name: string; description?: string; }
  interface WebmcpRecipe { name: string; description?: string; when?: string; components_used?: string[]; servers?: string[]; layout?: { type: string; columns?: number; arrangement?: string }; body?: string; }

  interface Props {
    open: boolean;
    composerMode?: boolean;
    layoutMode?: 'float' | 'grid';
    includeSummary?: boolean;
    onexport?: () => Promise<void>;
    exportState?: 'idle' | 'loading' | 'done';
    onhistory?: () => void;
    onclear?: () => void;
    mcpToken?: string;
    systemPrompt?: string;
    effectivePrompt?: string;
    maxTokens?: number;
    maxContextTokens?: number;
    maxTools?: number;
    maxResultLength?: number;
    compressHistory?: boolean;
    compressPreview?: number;
    contextRAGEnabled?: boolean;
    ragResidueSize?: number;
    cacheEnabled?: boolean;
    temperature?: number;
    topK?: number;
    showTokens?: boolean;
    showToolJSON?: boolean;
    showPipelineTrace?: boolean;
    schemaSanitize?: boolean;
    schemaFlatten?: boolean;
    schemaStrict?: boolean;
    providerKind?: 'remote' | 'wasm' | 'gemma' | 'local';
    onconnect: () => void;
    connectedUrls?: string[];
    loadingUrls?: string[];
    onaddserver?: (url: string) => void;
    onaddall?: () => void;
    onremoveserver?: (url: string) => void;
    mcpRecipes?: McpRecipe[];
    webmcpRecipes?: WebmcpRecipe[];
    localUrl?: string;
    localModel?: string;
    diagnostics?: Array<{ severity: 'error' | 'warning'; title: string; detail: string; quickFix?: string; codeFix?: string }>;
    serverRegistry?: Array<{ id: string; label: string; description: string; widgetCount: number }>;
    enabledServers?: Set<string>;
    onbrowserecipes?: () => void;
    recipeCountByServer?: Record<string, number>;
    onrecipeclick?: (url: string) => void;
    toolCountByServer?: Record<string, number>;
    ontoolclick?: (url: string) => void;
  }

  let {
    open = $bindable(false),
    composerMode = $bindable(true),
    layoutMode = $bindable<'float' | 'grid'>('float'),
    includeSummary = $bindable(true),
    onexport,
    exportState = 'idle',
    onhistory,
    onclear,
    mcpToken = $bindable(''),
    systemPrompt = $bindable(''),
    effectivePrompt = '',
    maxTokens = $bindable(4096),
    maxContextTokens = $bindable(120_000),
    maxTools = $bindable(8),
    maxResultLength = $bindable(10000),
    compressHistory = $bindable(false),
    compressPreview = $bindable(500),
    contextRAGEnabled = $bindable(false),
    ragResidueSize = $bindable(200),
    cacheEnabled = $bindable(true),
    temperature = $bindable(1.0),
    topK = $bindable(64),
    showTokens = $bindable(true),
    showToolJSON = $bindable(false),
    showPipelineTrace = $bindable(false),
    schemaSanitize = $bindable(true),
    schemaFlatten = $bindable(false),
    schemaStrict = $bindable(false),
    providerKind = 'remote',
    onconnect,
    connectedUrls = [],
    loadingUrls = [],
    onaddserver,
    onaddall,
    onremoveserver,
    mcpRecipes = [],
    webmcpRecipes = [],
    localUrl = $bindable('http://localhost:11434'),
    localModel = $bindable(''),
    diagnostics = [],
    serverRegistry = [],
    enabledServers = $bindable(new Set<string>()),
    onbrowserecipes,
    recipeCountByServer,
    onrecipeclick,
    toolCountByServer,
    ontoolclick,
  }: Props = $props();

  let diagModalOpen = $state(false);
  let serversCollapsed = $state(true);

  function toggleServer(id: string) {
    const next = new Set(enabledServers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    enabledServers = next;
  }
</script>

<!-- Backdrop -->
{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/40 z-40" onclick={() => open = false}></div>
{/if}

<!-- Drawer -->
<aside class="settings-drawer {open ? 'open' : ''}">

  <div class="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
    <span class="font-mono text-sm font-bold text-text1">Settings</span>
    <button class="text-text2 hover:text-text1 text-lg leading-none transition-colors"
            onclick={() => open = false}>x</button>
  </div>

  <div class="flex flex-col gap-6 p-5 overflow-y-auto flex-1">

    <!-- MCP custom URL -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">MCP server (manual URL)</div>
      <McpConnector
        url={canvas.mcpUrl}
        onurlchange={(v) => canvas.setMcpUrl(v)}
        bind:token={mcpToken}
        connecting={canvas.mcpConnecting}
        connected={canvas.mcpConnected}
        serverName={connectedUrls.length > 1 ? `multi-server (${connectedUrls.length})` : canvas.mcpName ?? ''}
        onconnect={onconnect}
      />
    </section>

    <!-- MCP demo servers -->
    <section class="flex flex-col gap-2">
      <RemoteMCPserversDemo
        servers={MCP_DEMO_SERVERS}
        {connectedUrls}
        loading={loadingUrls}
        onconnect={(url) => onaddserver?.(url)}
        onconnectall={() => onaddall?.()}
        ondisconnect={(url) => onremoveserver?.(url)}
        {recipeCountByServer}
        {onrecipeclick}
        {toolCountByServer}
        ontoolclick={(url) => ontoolclick?.(url)}
      />
    </section>

    <!-- WebMCP servers -->
    {#if serverRegistry.length > 0}
      <section class="flex flex-col gap-2">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="flex items-center gap-1 cursor-pointer select-none"
             onclick={() => serversCollapsed = !serversCollapsed}>
          <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">WebMCP servers</span>
          <span class="text-[9px] text-text2/60 font-mono">({enabledServers.size}/{serverRegistry.length})</span>
          <span class="text-[10px] text-text2 ml-auto transition-transform {serversCollapsed ? '' : 'rotate-90'}">{@html '&#x25B6;'}</span>
        </div>
        {#if !serversCollapsed}
          <div class="flex flex-col gap-1">
            {#each serverRegistry as srv (srv.id)}
              <label class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface2/50 cursor-pointer transition-colors group">
                <input
                  type="checkbox"
                  checked={enabledServers.has(srv.id)}
                  onchange={() => toggleServer(srv.id)}
                  class="w-3.5 h-3.5 rounded border-border2 accent-accent cursor-pointer"
                />
                <span class="flex flex-col flex-1 min-w-0">
                  <span class="text-xs font-mono text-text1 group-hover:text-accent transition-colors truncate">{srv.label}</span>
                  {#if srv.description}
                    <span class="text-[8px] font-mono text-text2/40 block truncate">{srv.description}</span>
                  {/if}
                </span>
                <span class="text-[9px] font-mono text-text2/50">{srv.widgetCount}w</span>
              </label>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    <!-- LLM -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">LLM model</div>
      <LLMSelector
        value={canvas.llm}
        onchange={(v) => canvas.setLlm(v as 'haiku'|'sonnet'|'gemma-e2b'|'gemma-e4b')}
        class="w-full"
      />
    </section>

    <!-- Local LLM -->
    {#if canvas.llm === 'local'}
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Local LLM</div>
      <input
        type="text"
        bind:value={localUrl}
        placeholder="http://localhost:11434"
        class="font-mono text-xs h-7 px-2 rounded border border-border2 bg-surface2 text-text1 w-full"
      />
      <input
        type="text"
        bind:value={localModel}
        placeholder="llama3.2, qwen2.5, mistral..."
        class="font-mono text-xs h-7 px-2 rounded border border-border2 bg-surface2 text-text1 w-full"
      />
      <div class="text-[9px] font-mono text-text2/60">
        Compatible Ollama, vLLM, LM Studio, llama.cpp
      </div>
    </section>
    {/if}

    <!-- Agent settings -->
    <section class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">Agent</span>
        <DiagnosticIcon count={diagnostics.length} onclick={() => diagModalOpen = true} />
      </div>
      <SettingsPanel
        bind:systemPrompt
        {effectivePrompt}
        bind:maxTokens
        bind:maxContextTokens
        bind:maxTools
        bind:maxResultLength
        bind:compressHistory
        bind:compressPreview
        bind:contextRAGEnabled
        bind:ragResidueSize
        bind:cacheEnabled
        bind:temperature
        bind:topK
        modelType={canvas.llm.startsWith('gemma') ? 'wasm' : 'remote'}
        modelId={canvas.llm}
      />
    </section>

    <!-- Mode & Layout -->
    <section class="flex flex-col gap-3">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Mode</div>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
        <input type="checkbox" bind:checked={composerMode} class="accent-accent w-3.5 h-3.5" />
        Composer mode
      </label>
      {#if composerMode}
        <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
          <input type="checkbox" checked={layoutMode === 'grid'} onchange={() => layoutMode = layoutMode === 'float' ? 'grid' : 'float'} class="accent-accent w-3.5 h-3.5" />
          Grid layout
        </label>
      {/if}
    </section>

    <!-- Export & History -->
    <section class="flex flex-col gap-3">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Export</div>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
        <input type="checkbox" bind:checked={includeSummary} class="accent-accent w-3.5 h-3.5" />
        Include summary
      </label>
      <button class="font-mono text-xs h-7 px-3 rounded border transition-colors w-full text-left flex items-center gap-2
                     {exportState === 'done' ? 'border-teal/40 text-teal' : 'border-border2 text-text2 hover:text-text1'}"
              onclick={onexport}
              disabled={exportState === 'loading'}>
        {#if exportState === 'loading'}
          <span class="inline-block w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></span>
          Preparing...
        {:else if exportState === 'done'}
          Copied &#x2713;
        {:else}
          Export HyperSkill
        {/if}
      </button>
      <button class="font-mono text-xs h-7 px-3 rounded border border-border2 text-text2 hover:text-text1 transition-colors w-full text-left"
              onclick={onhistory}>
        History
      </button>
      {#if onclear}
        <button class="font-mono text-xs h-7 px-3 rounded border border-accent2/30 text-accent2 hover:bg-accent2/10 transition-colors w-full text-left"
                onclick={() => { onclear(); open = false; }}>
          Clear (canvas + conversation)
        </button>
      {/if}
    </section>

    <!-- Schema transforms -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Schema LLM</div>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 {providerKind === 'gemma' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}">
        <input type="checkbox" bind:checked={schemaSanitize} disabled={providerKind === 'gemma'} class="accent-teal w-3.5 h-3.5" />
        Sanitize
        {#if providerKind === 'gemma'}
          <span class="text-[8px] text-text2/40 font-mono ml-auto">Ignoré par Gemma (format natif)</span>
        {/if}
      </label>
      <div class="text-[9px] font-mono text-text2/60 pl-5">
        {schemaSanitize ? 'Strip oneOf/anyOf/allOf/$ref from schemas' : 'Schemas sent as-is to the LLM'}
      </div>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
        <input type="checkbox" bind:checked={schemaFlatten} class="accent-teal w-3.5 h-3.5" />
        Flatten <span class="text-[8px] text-text2/40 font-mono">(experimental)</span>
      </label>
      <div class="text-[9px] font-mono text-text2/60 pl-5">
        {schemaFlatten ? 'Flattens nested objects to key__subkey' : 'Schemas with native nesting'}
      </div>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 {providerKind === 'gemma' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}">
        <input type="checkbox" bind:checked={schemaStrict} disabled={providerKind === 'gemma'} class="accent-teal w-3.5 h-3.5" />
        Strict tool use
        <span class="text-[8px] text-text2/40 font-mono">constrained grammar</span>
        {#if providerKind === 'gemma'}
          <span class="text-[8px] text-text2/40 font-mono ml-auto">Ignoré par Gemma (format natif)</span>
        {/if}
      </label>
      <div class="text-[9px] font-mono text-text2/60 pl-5">
        {schemaStrict ? 'Grammar-constrained JSON sampling' : 'Free sampling (sanitize + auto-repair is enough)'}
      </div>
    </section>

    <!-- Display -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Display</div>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
        <input type="checkbox" bind:checked={showTokens} class="accent-accent w-3.5 h-3.5" />
        Token usage
      </label>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
        <input type="checkbox" bind:checked={showToolJSON} class="accent-accent w-3.5 h-3.5" />
        Agent logs (bottom panel)
      </label>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
        <input type="checkbox" bind:checked={showPipelineTrace} class="accent-accent w-3.5 h-3.5" />
        Pipeline trace (logs)
      </label>
    </section>

    <!-- Recipes -->
    {#if mcpRecipes.length > 0 || webmcpRecipes.length > 0}
      <section class="flex flex-col gap-2">
        <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Recipes</div>
        <button
          class="font-mono text-[10px] h-6 px-3 rounded border border-accent/40 text-accent hover:bg-accent/10 transition-colors self-start"
          onclick={() => onbrowserecipes?.()}
        >
          Browse all recipes &rarr;
        </button>
      </section>
    {/if}

  </div>

  <!-- Build footer -->
  <div class="px-5 py-3 border-t border-border flex-shrink-0 flex items-center justify-between">
    <span class="font-mono text-[8px] text-text2/40">v{appVersion} · {gitHash} · {buildStamp}</span>
    <a href="https://github.com/jeanbaptiste/webmcp-auto-ui/tree/main/apps/flex"
       target="_blank" rel="noopener"
       class="font-mono text-[8px] text-text2/40 hover:text-text2 transition-colors">GitHub</a>
  </div>
</aside>

<DiagnosticModal bind:open={diagModalOpen} {diagnostics} onclose={() => diagModalOpen = false} />

<style>
  .settings-drawer {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 320px;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border2);
    z-index: 50;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 4px 0 32px rgba(0,0,0,0.2);
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .settings-drawer.open {
    transform: translateX(0);
  }
</style>
