<script lang="ts">
  declare const __BUILD_TIME__: string;
  declare const __GIT_HASH__: string;

  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';
  import { McpConnector, LLMSelector, SettingsPanel, RemoteMCPserversDemo } from '@webmcp-auto-ui/ui';
  import RecipeModal from './RecipeModal.svelte';

  const buildStamp = typeof __BUILD_TIME__ === 'string'
    ? __BUILD_TIME__.replace('T', ' ').replace('Z', '').slice(0, 23) : '';
  const gitHash = typeof __GIT_HASH__ === 'string' ? __GIT_HASH__ : '';

  interface McpRecipe { name: string; description?: string; }
  interface WebmcpRecipe { name: string; description?: string; when?: string; components_used?: string[]; servers?: string[]; layout?: { type: string; columns?: number; arrangement?: string }; body?: string; }

  interface Props {
    open: boolean;
    composerMode?: boolean;
    layoutMode?: 'float' | 'grid';
    includeSummary?: boolean;
    onexport?: () => void;
    onhistory?: () => void;
    mcpToken?: string;
    systemPrompt?: string;
    effectivePrompt?: string;
    maxTokens?: number;
    maxContextTokens?: number;
    maxTools?: number;
    cacheEnabled?: boolean;
    temperature?: number;
    topK?: number;
    showTokens?: boolean;
    showToolJSON?: boolean;
    schemaValidation?: boolean;
    onconnect: () => void;
    connectedUrls?: string[];
    loadingUrls?: string[];
    onaddserver?: (url: string) => void;
    onaddall?: () => void;
    onremoveserver?: (url: string) => void;
    mcpRecipes?: McpRecipe[];
    webmcpRecipes?: WebmcpRecipe[];
  }

  let {
    open = $bindable(false),
    composerMode = $bindable(true),
    layoutMode = $bindable<'float' | 'grid'>('float'),
    includeSummary = $bindable(true),
    onexport,
    onhistory,
    mcpToken = $bindable(''),
    systemPrompt = $bindable(''),
    effectivePrompt = '',
    maxTokens = $bindable(4096),
    maxContextTokens = $bindable(150_000),
    maxTools = $bindable(8),
    cacheEnabled = $bindable(true),
    temperature = $bindable(1.0),
    topK = $bindable(64),
    showTokens = $bindable(true),
    showToolJSON = $bindable(false),
    schemaValidation = $bindable(true),
    onconnect,
    connectedUrls = [],
    loadingUrls = [],
    onaddserver,
    onaddall,
    onremoveserver,
    mcpRecipes = [],
    webmcpRecipes = [],
  }: Props = $props();

  let selectedRecipe = $state<McpRecipe | WebmcpRecipe | null>(null);
  let recipeModalOpen = $state(false);

  function openRecipe(recipe: McpRecipe | WebmcpRecipe) {
    selectedRecipe = recipe;
    recipeModalOpen = true;
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
    <span class="font-mono text-sm font-bold text-text1">Parametres</span>
    <button class="text-text2 hover:text-text1 text-lg leading-none transition-colors"
            onclick={() => open = false}>x</button>
  </div>

  <div class="flex flex-col gap-6 p-5 overflow-y-auto flex-1">

    <!-- MCP custom URL -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Serveur MCP (URL manuelle)</div>
      <McpConnector
        url={canvas.mcpUrl}
        onurlchange={(v) => canvas.setMcpUrl(v)}
        bind:token={mcpToken}
        connecting={canvas.mcpConnecting}
        connected={canvas.mcpConnected}
        serverName={connectedUrls.length > 1 ? `multi-serveurs (${connectedUrls.length})` : canvas.mcpName ?? ''}
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
      />
    </section>

    <!-- LLM -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Modele LLM</div>
      <LLMSelector
        value={canvas.llm}
        onchange={(v) => canvas.setLlm(v as 'haiku'|'sonnet'|'gemma-e2b'|'gemma-e4b')}
        class="w-full"
      />
    </section>

    <!-- Agent settings -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Agent</div>
      <SettingsPanel
        bind:systemPrompt
        {effectivePrompt}
        bind:maxTokens
        bind:maxContextTokens
        bind:maxTools
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
        Mode compositeur
      </label>
      {#if composerMode}
        <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
          <input type="checkbox" checked={layoutMode === 'grid'} onchange={() => layoutMode = layoutMode === 'float' ? 'grid' : 'float'} class="accent-accent w-3.5 h-3.5" />
          Layout grille
        </label>
      {/if}
    </section>

    <!-- Export & History -->
    <section class="flex flex-col gap-3">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Export</div>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
        <input type="checkbox" bind:checked={includeSummary} class="accent-accent w-3.5 h-3.5" />
        Inclure synthese
      </label>
      <button class="font-mono text-xs h-7 px-3 rounded border border-border2 text-text2 hover:text-text1 transition-colors w-full text-left"
              onclick={onexport}>
        Exporter HyperSkill URL
      </button>
      <button class="font-mono text-xs h-7 px-3 rounded border border-border2 text-text2 hover:text-text1 transition-colors w-full text-left"
              onclick={onhistory}>
        Historique
      </button>
    </section>

    <!-- Validation -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Validation</div>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
        <input type="checkbox" bind:checked={schemaValidation} class="accent-teal w-3.5 h-3.5" />
        Schema validation
      </label>
      <div class="text-[9px] font-mono text-text2/60 pl-5">
        {schemaValidation ? 'Valide les params des widgets contre le schema JSON' : 'Pas de validation — les params sont passes tels quels'}
      </div>
    </section>

    <!-- Display -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Affichage</div>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
        <input type="checkbox" bind:checked={showTokens} class="accent-accent w-3.5 h-3.5" />
        Token usage
      </label>
      <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
        <input type="checkbox" bind:checked={showToolJSON} class="accent-accent w-3.5 h-3.5" />
        Agent logs (panneau bas)
      </label>
    </section>

    <!-- Recipes -->
    {#if mcpRecipes.length > 0 || webmcpRecipes.length > 0}
      <section class="flex flex-col gap-2">
        <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Recettes</div>

        {#if mcpRecipes.length > 0}
          <div class="text-[9px] font-mono text-text2 mt-1">MCP ({mcpRecipes.length})</div>
          <div class="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
            {#each mcpRecipes as recipe}
              <button class="px-2 py-1.5 bg-surface2/50 rounded text-left w-full cursor-pointer hover:bg-surface2 transition-colors"
                      onclick={() => openRecipe(recipe)}>
                <div class="font-mono text-[11px] text-text1">{recipe.name}</div>
                {#if recipe.description}
                  <div class="font-mono text-[9px] text-text2 line-clamp-2">{recipe.description}</div>
                {/if}
              </button>
            {/each}
          </div>
        {/if}

        {#if webmcpRecipes.length > 0}
          <div class="text-[9px] font-mono text-text2 mt-1">WebMCP ({webmcpRecipes.length})</div>
          <div class="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
            {#each webmcpRecipes as recipe}
              <button class="px-2 py-1.5 bg-surface2/50 rounded text-left w-full cursor-pointer hover:bg-surface2 transition-colors"
                      onclick={() => openRecipe(recipe)}>
                <div class="font-mono text-[11px] text-text1">{recipe.name}</div>
                {#if recipe.description}
                  <div class="font-mono text-[9px] text-text2 line-clamp-2">{recipe.description}</div>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

  </div>

  <!-- Build footer -->
  <div class="px-5 py-3 border-t border-border flex-shrink-0 flex items-center justify-between">
    <span class="font-mono text-[8px] text-text2/40">v1.0.0 · {gitHash} · {buildStamp}</span>
    <a href="https://github.com/jeanbaptiste/webmcp-auto-ui/tree/main/apps/flex2"
       target="_blank" rel="noopener"
       class="font-mono text-[8px] text-text2/40 hover:text-text2 transition-colors">GitHub</a>
  </div>
</aside>

<RecipeModal bind:open={recipeModalOpen} recipe={selectedRecipe} onclose={() => { selectedRecipe = null; }} />

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
