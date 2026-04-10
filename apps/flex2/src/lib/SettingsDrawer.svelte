<script lang="ts">
  import { canvas } from '@webmcp-auto-ui/sdk/canvas';
  import { MCP_DEMO_SERVERS } from '@webmcp-auto-ui/sdk';
  import { McpConnector, LLMSelector, SettingsPanel, RemoteMCPserversDemo } from '@webmcp-auto-ui/ui';
  import RecipeModal from './RecipeModal.svelte';

  interface McpRecipe { name: string; description?: string; }
  interface WebmcpRecipe { name: string; description?: string; when?: string; components_used?: string[]; servers?: string[]; layout?: { type: string; columns?: number; arrangement?: string }; body?: string; }

  interface Props {
    open: boolean;
    mcpToken?: string;
    systemPrompt?: string;
    maxTokens?: number;
    maxContextTokens?: number;
    cacheEnabled?: boolean;
    temperature?: number;
    topK?: number;
    showTokens?: boolean;
    showToolJSON?: boolean;
    toolMode?: 'smart' | 'explicit';
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
    mcpToken = $bindable(''),
    systemPrompt = $bindable(''),
    maxTokens = $bindable(4096),
    maxContextTokens = $bindable(150_000),
    cacheEnabled = $bindable(true),
    temperature = $bindable(1.0),
    topK = $bindable(64),
    showTokens = $bindable(true),
    showToolJSON = $bindable(false),
    toolMode = $bindable<'smart' | 'explicit'>('smart'),
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
        bind:maxTokens
        bind:maxContextTokens
        bind:cacheEnabled
        bind:temperature
        bind:topK
        modelType={canvas.llm.startsWith('gemma') ? 'wasm' : 'remote'}
        modelId={canvas.llm}
      />
    </section>

    <!-- Tools -->
    <section class="flex flex-col gap-2">
      <div class="text-[9px] font-mono text-text2 uppercase tracking-wider">Outils UI</div>
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-2 font-mono text-xs text-text1 cursor-pointer">
          <input type="checkbox" checked={toolMode === 'smart'} onchange={() => toolMode = toolMode === 'smart' ? 'explicit' : 'smart'} class="accent-accent w-3.5 h-3.5" />
          Smart (1 tool component)
        </label>
        <span class="tooltip-trigger relative cursor-help text-text2/60 text-[10px] font-mono leading-none select-none"
              role="button" tabindex="0">
          (?)
          <span class="tooltip-content">
            <strong>Mode Smart</strong> : 1 seul outil component(). L'agent appelle component("help") pour decouvrir les composants, component("help","nom") pour le schema, et component("nom",{'{params}'}) pour rendre. ~300 tokens.<br/><br/>
            <strong>Mode Explicit</strong> : 31 outils render_* individuels + component(). Utile pour le debug ou si l'agent a du mal avec le mode smart. ~4000 tokens.
          </span>
        </span>
      </div>
      <div class="text-[9px] font-mono text-text2/60 pl-5">
        {toolMode === 'smart' ? '1 tool component() — ~300 tokens' : '31 render_* + component() — ~4000 tokens'}
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

  /* Tooltip */
  .tooltip-trigger .tooltip-content {
    display: none;
    position: absolute;
    left: 50%;
    bottom: calc(100% + 6px);
    transform: translateX(-50%);
    width: 240px;
    padding: 8px 10px;
    background: var(--color-surface2, #1e1e2e);
    border: 1px solid var(--color-border2, #333);
    border-radius: 6px;
    font-size: 9px;
    line-height: 1.4;
    color: var(--color-text2, #aaa);
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    z-index: 60;
    pointer-events: none;
  }
  .tooltip-trigger:hover .tooltip-content,
  .tooltip-trigger:focus .tooltip-content {
    display: block;
  }

</style>
