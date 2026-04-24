<svelte:options customElement={{ tag: 'auto-recipe-browser', shadow: 'none' }} />

<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { filterRecipes, sortRecipes, recipeToMarkdown, recipeToDownloadBlob } from '@webmcp-auto-ui/agent';
  import { encode } from '@webmcp-auto-ui/sdk';
  import { extractCellsFromRecipe } from '@webmcp-auto-ui/ui';
  import type { McpMultiClient } from '@webmcp-auto-ui/core';
  import type { RecipeData } from '@webmcp-auto-ui/sdk';

  interface RecipeItem {
    name: string;
    description?: string;
    body?: string;
    when?: string;
    components_used?: string[];
    servers?: string[];
    layout?: { type: string; columns?: number; arrangement?: string };
    originalName?: string;
    serverUrl?: string;
    server?: string;
    serverName?: string;
    id?: string;
    [key: string]: unknown;
  }

  interface Props {
    open: boolean;
    mcpRecipes: RecipeItem[];
    webmcpRecipes: RecipeItem[];
    initialFilter?: string;
    /** Layout toggle: list (default) or grid */
    layout?: 'list' | 'grid';
    onOpenInNotebook?: (type: string, data: Record<string, unknown>) => void;
    /** Called when user clicks a recipe to view its detail. Host shows the recipe modal. */
    onOpenRecipe?: (recipe: RecipeItem) => void;
  }

  let {
    open = $bindable(false),
    mcpRecipes = [],
    webmcpRecipes = [],
    initialFilter = '',
    layout: initialLayout = 'list',
    onOpenInNotebook,
    onOpenRecipe,
  }: Props = $props();

  function getMultiClient(): McpMultiClient | undefined {
    return (globalThis as unknown as { __multiMcp?: { multiClient: McpMultiClient } }).__multiMcp?.multiClient;
  }

  let query = $state('');
  /** Kind filter: 'all' | 'mcp' | 'webmcp' — ported from vanilla recipe-browser */
  let kind = $state<'all' | 'mcp' | 'webmcp'>('all');
  /** Layout toggle — ported from vanilla recipe-browser */
  let layout = $state<'list' | 'grid'>(initialLayout);
  let selected = $state<RecipeItem | null>(null);
  let mcpCollapsed = $state(false);
  let webmcpCollapsed = $state(false);
  let copyState = $state<'idle' | 'copied'>('idle');
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  // Sync initialFilter into search when modal opens
  $effect(() => {
    if (open) {
      query = initialFilter ?? '';
      kind = 'all';
      selected = null;
    }
  });

  function applyKindFilter(recipes: RecipeItem[], filterKind: 'all' | 'mcp' | 'webmcp'): RecipeItem[] {
    if (filterKind === 'all') return recipes;
    return recipes.filter((_r) => {
      // webmcpRecipes are already separated — use the array membership to determine kind
      return filterKind === 'webmcp' ? webmcpRecipes.includes(_r) : mcpRecipes.includes(_r);
    });
  }

  const filteredMcp = $derived(
    kind === 'webmcp' ? [] : sortRecipes(filterRecipes(mcpRecipes, query))
  );
  const filteredWebmcp = $derived(
    kind === 'mcp' ? [] : sortRecipes(filterRecipes(webmcpRecipes, query))
  );
  const totalResults = $derived(filteredMcp.length + filteredWebmcp.length);

  function close() { open = false; selected = null; }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  async function openRecipe(recipe: RecipeItem) {
    await ensureBody(recipe);
    selected = recipe;
    onOpenRecipe?.(recipe);
  }

  async function downloadRecipe(recipe: RecipeItem) {
    const { blob, filename } = recipeToDownloadBlob(recipe as Record<string, unknown>);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function ensureBody(recipe: RecipeItem) {
    const multiClient = getMultiClient();
    if (recipe.body || !recipe.serverUrl || !multiClient) return;
    try {
      const identifier = recipe.originalName ?? recipe.name;
      const res = await multiClient.callToolOn(recipe.serverUrl, 'get_recipe', {
        name: identifier,
        id: (recipe as any).id ?? identifier,
      });
      const text = res.content?.find((c: { type: string }) => c.type === 'text') as { text?: string } | undefined;
      if (text?.text) {
        let body = text.text;
        try {
          const parsed = JSON.parse(body);
          if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
            body = parsed.content;
          }
        } catch { /* not JSON — keep raw text */ }
        recipe.body = body;
      }
    } catch (err) {
      console.warn('[RecipeBrowser] get_recipe failed:', err);
    }
  }

  async function openInNotebook(recipe: RecipeItem) {
    await ensureBody(recipe);
    const body = recipe.body ?? '';

    const cells = extractCellsFromRecipe(body, {
      title: recipe.name,
      description: recipe.description,
    });

    const connected = getMultiClient()?.listServers() ?? [];
    const serverNames = Array.isArray(recipe.servers) ? recipe.servers : [];
    const servers = serverNames
      .map((name) => {
        const hit = connected.find((s) => s.name === name);
        const url = hit?.url ?? (typeof recipe.serverUrl === 'string' ? recipe.serverUrl : undefined);
        return url ? { name, url, kind: 'data' as const } : null;
      })
      .filter((s): s is { name: string; url: string; kind: 'data' } => s !== null);

    const data: Record<string, unknown> = {
      title: recipe.name,
      cells,
      mode: 'edit',
      servers,
    };

    onOpenInNotebook?.('notebook', data);
    close();
  }

  async function copyHyperSkillUrl(recipe: RecipeItem) {
    try {
      const md = recipeToMarkdown(recipe as Record<string, unknown>);
      const hsUrl = await encode(window.location.origin, md);
      await navigator.clipboard.writeText(hsUrl);
      copyState = 'copied';
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copyState = 'idle'; }, 2000);
    } catch (err) {
      console.error('Failed to copy HyperSkill URL:', err);
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
    transition:fade={{ duration: 180 }}
    onclick={(e) => { if (e.target === e.currentTarget) close(); }}
  >
    <div
      class="w-full max-w-2xl max-h-[85vh] bg-surface border border-border2 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
      transition:fly={{ y: 24, duration: 240 }}
    >
      <!-- Header -->
      <div class="flex items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0">
        <span class="font-mono text-sm font-bold text-text1 flex-1">Recipe Browser</span>
        <button class="text-text2 hover:text-text1 font-mono text-base leading-none transition-colors"
                onclick={close}>x</button>
      </div>

      <!-- Toolbar: search + kind filter + layout toggle -->
      <div class="px-6 pt-4 pb-2 flex-shrink-0 flex items-center gap-2">
        <input
          type="text"
          bind:value={query}
          placeholder="Search recipes..."
          class="font-mono text-xs h-8 px-3 rounded-lg border border-border2 bg-surface2 text-text1 flex-1 placeholder:text-text2/40 focus:outline-none focus:border-accent/50 transition-colors"
        />

        <!-- Kind filter — ported from vanilla recipe-browser -->
        <select
          bind:value={kind}
          class="font-mono text-xs h-8 px-2 rounded-lg border border-border2 bg-surface2 text-text1 focus:outline-none focus:border-accent/50 transition-colors"
        >
          <option value="all">All kinds</option>
          <option value="webmcp">WebMCP</option>
          <option value="mcp">MCP</option>
        </select>

        <!-- Layout toggle — ported from vanilla recipe-browser -->
        <div class="flex rounded-lg border border-border2 overflow-hidden">
          <button
            type="button"
            onclick={() => layout = 'list'}
            class="font-mono text-xs px-2 h-8 transition-colors {layout === 'list' ? 'bg-accent text-white' : 'bg-surface2 text-text2 hover:text-text1'}"
            title="List view"
          >list</button>
          <button
            type="button"
            onclick={() => layout = 'grid'}
            class="font-mono text-xs px-2 h-8 transition-colors {layout === 'grid' ? 'bg-accent text-white' : 'bg-surface2 text-text2 hover:text-text1'}"
            title="Grid view"
          >grid</button>
        </div>
      </div>

      <!-- Recipe lists -->
      <div class="flex-1 overflow-y-auto px-6 pb-5 flex flex-col gap-3">

        {#if totalResults === 0}
          <div class="flex items-center justify-center py-12">
            <span class="font-mono text-xs text-text2">No recipes found</span>
          </div>
        {:else}

          <!-- Grid layout merges both lists -->
          {#if layout === 'grid'}
            <div class="grid grid-cols-2 gap-2 mt-2">
              {#each [...filteredMcp, ...filteredWebmcp] as recipe, i (`grid:${recipe.name}:${i}`)}
                {@const isWebmcp = webmcpRecipes.includes(recipe)}
                <div class="group flex flex-col gap-1 p-3 bg-surface2/50 rounded-lg hover:bg-surface2 transition-colors cursor-pointer border border-border2/50"
                     onclick={() => openRecipe(recipe)}>
                  <div class="font-mono text-[11px] text-text1 font-medium truncate">{recipe.name}</div>
                  {#if recipe.description}
                    <div class="font-mono text-[9px] text-text2 line-clamp-2">{recipe.description}</div>
                  {/if}
                  <div class="flex items-center gap-1 mt-auto pt-1">
                    <span class="font-mono text-[9px] px-1.5 py-0.5 rounded-full border {isWebmcp ? 'border-teal/40 text-teal' : 'border-accent/40 text-accent'}">
                      {isWebmcp ? 'webmcp' : 'mcp'}
                    </span>
                  </div>
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="Download .md"
                      class="font-mono text-[10px] h-5 px-1.5 rounded border border-border2 text-text2 hover:text-text1 transition-colors"
                      onclick={(e) => { e.stopPropagation(); downloadRecipe(recipe); }}
                    >.md</button>
                    <button
                      title="Open in notebook"
                      class="font-mono text-[10px] h-5 px-1.5 rounded border border-border2 text-text2 hover:text-text1 transition-colors"
                      onclick={(e) => { e.stopPropagation(); openInNotebook(recipe); }}
                    >nb</button>
                    <button
                      title="Copy HyperSkill URL"
                      class="font-mono text-[10px] h-5 px-1.5 rounded border transition-colors {copyState === 'copied' ? 'border-teal/40 text-teal' : 'border-accent/40 text-accent hover:bg-accent/10'}"
                      onclick={(e) => { e.stopPropagation(); copyHyperSkillUrl(recipe); }}
                    >{copyState === 'copied' ? '✓' : 'hs'}</button>
                  </div>
                </div>
              {/each}
            </div>

          {:else}
            <!-- List layout (default) -->

            <!-- MCP Recipes -->
            {#if filteredMcp.length > 0}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="flex items-center gap-1 cursor-pointer select-none mt-2"
                onclick={() => mcpCollapsed = !mcpCollapsed}
              >
                <span class="text-[10px] font-mono text-text2 uppercase tracking-wider">MCP Recipes ({filteredMcp.length})</span>
                <span class="text-[10px] text-text2 ml-auto transition-transform {mcpCollapsed ? '' : 'rotate-90'}">{@html '&#x25B6;'}</span>
              </div>
              {#if !mcpCollapsed}
                <div class="flex flex-col gap-1">
                  {#each filteredMcp as recipe, i (`mcp:${recipe.name}:${i}`)}
                    <div class="group flex items-center gap-2 px-3 py-2 bg-surface2/50 rounded-lg hover:bg-surface2 transition-colors">
                      <button
                        class="flex-1 min-w-0 text-left cursor-pointer"
                        onclick={() => openRecipe(recipe)}
                      >
                        <div class="font-mono text-[11px] text-text1 font-medium truncate">{recipe.name}</div>
                        {#if recipe.description}
                          <div class="font-mono text-[9px] text-text2 line-clamp-1 mt-0.5">{recipe.description}</div>
                        {/if}
                      </button>
                      <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          title="Download .md"
                          class="font-mono text-[10px] h-6 px-2 rounded border border-border2 text-text2 hover:text-text1 transition-colors"
                          onclick={(e) => { e.stopPropagation(); downloadRecipe(recipe); }}
                        >.md</button>
                        <button
                          title="Open in notebook"
                          class="font-mono text-[10px] h-6 px-2 rounded border border-border2 text-text2 hover:text-text1 transition-colors"
                          onclick={(e) => { e.stopPropagation(); openInNotebook(recipe); }}
                        >nb</button>
                        <button
                          title="Copy HyperSkill URL"
                          class="font-mono text-[10px] h-6 px-2 rounded border transition-colors {copyState === 'copied' ? 'border-teal/40 text-teal' : 'border-accent/40 text-accent hover:bg-accent/10'}"
                          onclick={(e) => { e.stopPropagation(); copyHyperSkillUrl(recipe); }}
                        >{copyState === 'copied' ? '✓' : 'hs'}</button>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            {/if}

            <!-- WebMCP Recipes -->
            {#if filteredWebmcp.length > 0}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="flex items-center gap-1 cursor-pointer select-none mt-2"
                onclick={() => webmcpCollapsed = !webmcpCollapsed}
              >
                <span class="text-[10px] font-mono text-text2 uppercase tracking-wider">WebMCP Recipes ({filteredWebmcp.length})</span>
                <span class="text-[10px] text-text2 ml-auto transition-transform {webmcpCollapsed ? '' : 'rotate-90'}">{@html '&#x25B6;'}</span>
              </div>
              {#if !webmcpCollapsed}
                <div class="flex flex-col gap-1">
                  {#each filteredWebmcp as recipe, i (`webmcp:${recipe.name}:${i}`)}
                    <div class="group flex items-center gap-2 px-3 py-2 bg-surface2/50 rounded-lg hover:bg-surface2 transition-colors">
                      <button
                        class="flex-1 min-w-0 text-left cursor-pointer"
                        onclick={() => openRecipe(recipe)}
                      >
                        <div class="font-mono text-[11px] text-text1 font-medium truncate">{recipe.name}</div>
                        {#if recipe.description}
                          <div class="font-mono text-[9px] text-text2 line-clamp-1 mt-0.5">{recipe.description}</div>
                        {/if}
                      </button>
                      <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          title="Download .md"
                          class="font-mono text-[10px] h-6 px-2 rounded border border-border2 text-text2 hover:text-text1 transition-colors"
                          onclick={(e) => { e.stopPropagation(); downloadRecipe(recipe); }}
                        >.md</button>
                        <button
                          title="Open in notebook"
                          class="font-mono text-[10px] h-6 px-2 rounded border border-border2 text-text2 hover:text-text1 transition-colors"
                          onclick={(e) => { e.stopPropagation(); openInNotebook(recipe); }}
                        >nb</button>
                        <button
                          title="Copy HyperSkill URL"
                          class="font-mono text-[10px] h-6 px-2 rounded border transition-colors {copyState === 'copied' ? 'border-teal/40 text-teal' : 'border-accent/40 text-accent hover:bg-accent/10'}"
                          onclick={(e) => { e.stopPropagation(); copyHyperSkillUrl(recipe); }}
                        >{copyState === 'copied' ? '✓' : 'hs'}</button>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            {/if}
          {/if}

        {/if}
      </div>
    </div>
  </div>
{/if}
