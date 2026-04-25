<script lang="ts" module>
  declare const __BUILD_TIME__: string;
  declare const __GIT_HASH__: string;
  declare const __APP_VERSION__: string;
</script>

<script lang="ts">
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';
  import { Dialog, DialogContent, DialogTitle } from '@webmcp-auto-ui/ui';
  import { McpConnector, LLMSelector, SettingsPanel, MCPserversList, DiagnosticModal, DiagnosticIcon, ModelCacheManager } from '@webmcp-auto-ui/ui';

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
    visualTrace?: boolean;
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
    serverRegistry?: Array<{ id: string; label: string; description: string; widgetCount: number; category?: 'generic' | '2d3d' | 'charts' | 'graph' | 'dashboard' | 'geo' }>;
    enabledServers?: Set<string>;
    onbrowserecipes?: () => void;
    recipeCountByServer?: Record<string, number>;
    onrecipeclick?: (url: string) => void;
    toolCountByServer?: Record<string, number>;
    ontoolclick?: (url: string) => void;
    webmcpRecipeCountByServer?: Record<string, number>;
    webmcpToolCountByServer?: Record<string, number>;
    onwebmcprecipeclick?: (id: string) => void;
    onwebmcptoolclick?: (id: string) => void;
  }

  let {
    open = $bindable(false),
    composerMode = $bindable(true),
    layoutMode = $bindable<'float' | 'grid'>('float'),
    includeSummary = $bindable(false),
    onexport,
    exportState = 'idle',
    onhistory,
    onclear,
    mcpToken = $bindable(''),
    systemPrompt = $bindable(''),
    effectivePrompt = '',
    maxTokens = $bindable(4096),
    maxContextTokens = $bindable(120_000),
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
    visualTrace = $bindable(false),
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
    webmcpRecipeCountByServer,
    webmcpToolCountByServer,
    onwebmcprecipeclick,
    onwebmcptoolclick,
  }: Props = $props();

  let diagModalOpen = $state(false);
  let mcpShowToken = $state(false);
  let manualUrl = $state('');

  function toggleServer(id: string) {
    const next = new Set(enabledServers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    enabledServers = next;
  }

  // ── WebMCP server grouping by category ──────────────────────────────
  const CATEGORY_ORDER = ['generic', 'charts', 'graph', 'dashboard', '2d3d', 'geo'] as const;
  const CATEGORY_LABELS: Record<(typeof CATEGORY_ORDER)[number], string> = {
    generic: 'Générique',
    charts: 'Charts',
    graph: 'Graphes & réseaux',
    dashboard: 'Dashboards',
    '2d3d': '2D / 3D',
    geo: 'Géo & cartes',
  };
  let serversCollapsed = $state(true);
  let groupedServers = $derived(
    CATEGORY_ORDER
      .map((cat) => ({
        key: cat,
        label: CATEGORY_LABELS[cat],
        items: serverRegistry.filter((s) => (s.category ?? 'generic') === cat),
      }))
      .filter((g) => g.items.length > 0)
  );
</script>

<Dialog bind:open>
  <DialogContent
    class="!left-0 !top-0 !right-auto !bottom-0 !translate-x-0 !translate-y-0 !rounded-none !rounded-r-none !max-w-[320px] !w-[320px] !h-full !p-0 flex flex-col overflow-hidden !shadow-[4px_0_32px_rgba(0,0,0,0.2)]"
  >
    <!-- Title (visually hidden — required for a11y) -->
    <DialogTitle class="sr-only">Settings</DialogTitle>

    <div class="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
      <span class="font-mono text-sm font-bold text-text1">Settings</span>
    </div>

    <div class="flex flex-col gap-6 p-5 overflow-y-auto flex-1">

      <!-- MCP custom URL -->
      <section class="flex flex-col gap-2">
        <div class="flex items-center gap-1.5">
          <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">MCP server (manual URL)</span>
          <button
            onclick={() => mcpShowToken = !mcpShowToken}
            class="text-text2 hover:text-text1 transition-colors flex-shrink-0"
            title="Bearer token"
            aria-label="Toggle bearer token input"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <McpConnector
          url={manualUrl}
          onurlchange={(v) => { manualUrl = v; canvas.addMcpServer(v); }}
          bind:token={mcpToken}
          bind:showToken={mcpShowToken}
          connecting={!!manualUrl && canvas.dataServers.some((s) => s.url === manualUrl && !s.connected)}
          connected={!!manualUrl && canvas.dataServers.some((s) => s.url === manualUrl && s.connected)}
          serverName={manualUrl ? (() => { const e = canvas.dataServers.find((s) => s.url === manualUrl); return e?.serverName ?? e?.name ?? ''; })() : ''}
          onconnect={onconnect}
          ondisconnect={() => { if (manualUrl) onremoveserver?.(manualUrl); manualUrl = ''; }}
        />
      </section>

      <!-- MCP demo servers -->
      <section class="flex flex-col gap-2">
        <MCPserversList
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
          <div class="flex flex-col gap-2">
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="flex items-center gap-1 cursor-pointer select-none"
                 onclick={() => serversCollapsed = !serversCollapsed}>
              <span class="text-[9px] font-mono text-text2 uppercase tracking-wider">WebMCP servers</span>
              <span class="text-[9px] text-text2/60 font-mono">({enabledServers.size}/{serverRegistry.length})</span>
              <span class="text-[10px] text-text2 ml-auto transition-transform {serversCollapsed ? '' : 'rotate-90'}">{@html '&#x25B6;'}</span>
            </div>

            {#if !serversCollapsed}
              <div class="flex flex-col gap-3">
                {#each groupedServers as group (group.key)}
                  <div class="flex flex-col gap-1">
                    <div class="text-[9px] font-mono text-text2/70 uppercase tracking-wider pl-0.5">{group.label}</div>
                    {#each group.items as srv (srv.id)}
                      {@const enabled = enabledServers.has(srv.id)}
                      {@const recipes = webmcpRecipeCountByServer?.[srv.id] ?? 0}
                      {@const tools = webmcpToolCountByServer?.[srv.id] ?? 0}
                      <div class="group flex items-center gap-2 px-2 py-1.5 rounded border border-border2 bg-surface2 hover:border-accent/30 transition-colors">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onchange={() => toggleServer(srv.id)}
                          class="w-3.5 h-3.5 rounded border-border2 accent-accent cursor-pointer flex-shrink-0"
                        />
                        <div class="flex-1 min-w-0 flex flex-col">
                          <span class="font-mono text-xs font-medium text-text1 truncate">{srv.label}</span>
                          {#if srv.description}
                            <span class="text-[10px] text-text2 truncate">{srv.description}</span>
                          {/if}
                          {#if enabled && (recipes > 0 || tools > 0)}
                            <span class="flex items-center gap-1.5 mt-0.5">
                              {#if recipes > 0}
                                <button class="text-[10px] font-mono text-accent hover:underline"
                                        onclick={(e) => { e.stopPropagation(); onwebmcprecipeclick?.(srv.id); }}>
                                  {recipes} recipes
                                </button>
                              {/if}
                              {#if recipes > 0 && tools > 0}
                                <span class="text-[10px] text-text2">·</span>
                              {/if}
                              {#if tools > 0}
                                <button class="text-[10px] font-mono text-accent hover:underline"
                                        onclick={(e) => { e.stopPropagation(); onwebmcptoolclick?.(srv.id); }}>
                                  {tools} tools
                                </button>
                              {/if}
                            </span>
                          {/if}
                        </div>
                        <span class="text-[9px] font-mono text-text2/50 flex-shrink-0">{srv.widgetCount}w</span>
                      </div>
                    {/each}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
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

      <!-- Model cache -->
      <section class="flex flex-col gap-2">
        <ModelCacheManager />
      </section>

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
          bind:maxResultLength
          bind:compressHistory
          bind:compressPreview
          bind:contextRAGEnabled
          bind:ragResidueSize
          bind:cacheEnabled
          bind:temperature
          bind:topK
          bind:visualTrace
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
            <span class="text-[8px] text-text2/40 font-mono ml-auto">Ignored by Gemma (native format)</span>
          {/if}
        </label>
        <div class="text-[9px] font-mono text-text2/60 pl-5">
          {schemaStrict ? 'Grammar-constrained sampling + strips oneOf/anyOf/allOf/$ref from schemas' : 'Free sampling, schemas sent as-is (may break on complex MCP schemas)'}
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
  </DialogContent>
</Dialog>

<DiagnosticModal bind:open={diagModalOpen} {diagnostics} onclose={() => diagModalOpen = false} />
