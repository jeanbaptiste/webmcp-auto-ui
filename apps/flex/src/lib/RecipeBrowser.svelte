<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { filterRecipes, sortRecipes, recipeToMarkdown, recipeToDownloadBlob } from '@webmcp-auto-ui/agent';
  import { encode } from '@webmcp-auto-ui/sdk';
  import { MarkdownView } from '@webmcp-auto-ui/ui';
  import type { McpMultiClient } from '@webmcp-auto-ui/core';

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
    [key: string]: unknown;
  }

  interface Props {
    open: boolean;
    mcpRecipes: RecipeItem[];
    webmcpRecipes: RecipeItem[];
    initialFilter?: string;
    multiClient?: McpMultiClient;
  }

  let { open = $bindable(false), mcpRecipes = [], webmcpRecipes = [], initialFilter = '', multiClient }: Props = $props();

  let query = $state('');
  let selected = $state<RecipeItem | null>(null);
  let mcpCollapsed = $state(false);
  let webmcpCollapsed = $state(false);
  let copyState = $state<'idle' | 'copied'>('idle');
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  // Sync initialFilter into search when modal opens
  $effect(() => {
    if (open) {
      query = initialFilter ?? '';
      selected = null;
    }
  });

  const filteredMcp = $derived(sortRecipes(filterRecipes(mcpRecipes, query)));
  const filteredWebmcp = $derived(sortRecipes(filterRecipes(webmcpRecipes, query)));
  const totalResults = $derived(filteredMcp.length + filteredWebmcp.length);

  function close() { open = false; selected = null; }
  function back() { selected = null; }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (selected) back();
      else close();
    }
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

  async function openRecipe(recipe: RecipeItem) {
    if (!recipe.body && recipe.serverUrl && multiClient) {
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
    selected = recipe;
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
      {#if selected}
        <!-- ── Detail mode ─────────────────────────────────────────── -->

        <!-- Header -->
        <div class="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
          <button
            class="text-text2 hover:text-text1 font-mono text-sm transition-colors"
            onclick={back}
          >&larr;</button>
          <span class="font-mono text-sm font-bold text-text1 flex-1 truncate">{selected.name}</span>
          <button class="text-text2 hover:text-text1 font-mono text-base leading-none transition-colors"
                  onclick={close}>x</button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {#if selected.description}
            <p class="font-mono text-xs text-text2 leading-relaxed">{selected.description}</p>
          {/if}

          <!-- Metadata badges -->
          {#if selected.when}
            <div>
              <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1">When</div>
              <p class="font-mono text-xs text-text1 leading-relaxed">{selected.when}</p>
            </div>
          {/if}

          {#if selected.components_used && selected.components_used.length > 0}
            <div>
              <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1.5">Components</div>
              <div class="flex flex-wrap gap-1.5">
                {#each selected.components_used as comp}
                  <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono border border-accent/40 text-accent bg-accent/5">{comp}</span>
                {/each}
              </div>
            </div>
          {/if}

          {#if selected.servers && selected.servers.length > 0}
            <div>
              <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1.5">Servers</div>
              <div class="flex flex-wrap gap-1.5">
                {#each selected.servers as server}
                  <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono border border-teal/40 text-teal bg-teal/5">{server}</span>
                {/each}
              </div>
            </div>
          {/if}

          {#if selected.layout}
            <div>
              <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1">Layout</div>
              <p class="font-mono text-xs text-text1">
                {selected.layout.type}{#if selected.layout.columns}, {selected.layout.columns} columns{/if}{#if selected.layout.arrangement} — {selected.layout.arrangement}{/if}
              </p>
            </div>
          {/if}

          {#if selected.body}
            <div>
              <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-2">Body</div>
              <MarkdownView source={selected.body} />
            </div>
          {/if}
        </div>

        <!-- Action buttons -->
        <div class="flex items-center justify-end gap-2 px-6 py-3 border-t border-border flex-shrink-0">
          <button
            class="font-mono text-xs h-7 px-4 rounded border border-border2 text-text2 hover:text-text1 transition-colors"
            onclick={() => downloadRecipe(selected!)}
          >
            Download .md
          </button>
          <button
            class="font-mono text-xs h-7 px-4 rounded border transition-colors
                   {copyState === 'copied' ? 'border-teal/40 text-teal' : 'border-accent/40 text-accent hover:bg-accent/10'}"
            onclick={() => copyHyperSkillUrl(selected!)}
          >
            {#if copyState === 'copied'}
              Copied &#x2713;
            {:else}
              Copy HyperSkill URL
            {/if}
          </button>
        </div>

      {:else}
        <!-- ── List mode ───────────────────────────────────────────── -->

        <!-- Header -->
        <div class="flex items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0">
          <span class="font-mono text-sm font-bold text-text1 flex-1">Recipe Browser</span>
          <button class="text-text2 hover:text-text1 font-mono text-base leading-none transition-colors"
                  onclick={close}>x</button>
        </div>

        <!-- Search -->
        <div class="px-6 pt-4 pb-2 flex-shrink-0">
          <input
            type="text"
            bind:value={query}
            placeholder="Search recipes..."
            class="font-mono text-xs h-8 px-3 rounded-lg border border-border2 bg-surface2 text-text1 w-full placeholder:text-text2/40 focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <!-- Recipe lists -->
        <div class="flex-1 overflow-y-auto px-6 pb-5 flex flex-col gap-3">

          {#if totalResults === 0}
            <div class="flex items-center justify-center py-12">
              <span class="font-mono text-xs text-text2">No recipes found</span>
            </div>
          {:else}

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
                    <button
                      class="px-3 py-2 bg-surface2/50 rounded-lg text-left w-full cursor-pointer hover:bg-surface2 transition-colors"
                      onclick={() => openRecipe(recipe)}
                    >
                      <div class="font-mono text-[11px] text-text1 font-medium">{recipe.name}</div>
                      {#if recipe.description}
                        <div class="font-mono text-[9px] text-text2 line-clamp-1 mt-0.5">{recipe.description}</div>
                      {/if}
                    </button>
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
                    <button
                      class="px-3 py-2 bg-surface2/50 rounded-lg text-left w-full cursor-pointer hover:bg-surface2 transition-colors"
                      onclick={() => openRecipe(recipe)}
                    >
                      <div class="font-mono text-[11px] text-text1 font-medium">{recipe.name}</div>
                      {#if recipe.description}
                        <div class="font-mono text-[9px] text-text2 line-clamp-1 mt-0.5">{recipe.description}</div>
                      {/if}
                    </button>
                  {/each}
                </div>
              {/if}
            {/if}

          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
