<script lang="ts">
  import type { Recipe, McpRecipe } from '@webmcp-auto-ui/agent';

  interface Props {
    localRecipes: Recipe[];
    mcpRecipes: McpRecipe[];
    selectedId: string | null;
    onselect: (id: string, source: 'local' | 'mcp') => void;
  }

  let { localRecipes, mcpRecipes, selectedId, onselect }: Props = $props();

  let filter = $state('');

  const filteredLocal = $derived(
    filter.trim()
      ? localRecipes.filter(r =>
          r.name.toLowerCase().includes(filter.toLowerCase()) ||
          (r.description ?? '').toLowerCase().includes(filter.toLowerCase())
        )
      : localRecipes
  );

  const filteredMcp = $derived(
    filter.trim()
      ? mcpRecipes.filter(r =>
          r.name.toLowerCase().includes(filter.toLowerCase()) ||
          (r.description ?? '').toLowerCase().includes(filter.toLowerCase())
        )
      : mcpRecipes
  );
</script>

<div class="flex flex-col h-full">
  <!-- Search -->
  <div class="p-2 border-b border-border">
    <input
      type="text"
      bind:value={filter}
      placeholder="Filtrer..."
      class="w-full bg-surface2 border border-border2 rounded px-2 h-7 text-xs font-mono text-text1
             outline-none placeholder:text-text2/40 focus:border-accent/50 transition-colors"
    />
  </div>

  <!-- List -->
  <div class="flex-1 overflow-y-auto">
    {#if filteredLocal.length > 0}
      <div class="px-2 pt-2 pb-1">
        <span class="text-[9px] font-mono uppercase tracking-wider text-text2">
          WebMCP ({filteredLocal.length})
        </span>
      </div>
      {#each filteredLocal as recipe (recipe.id)}
        <button
          class="w-full text-left px-3 py-2 border-b border-border/50 hover:bg-surface2 transition-colors
                 {selectedId === recipe.id ? 'bg-accent/10 border-l-2 border-l-accent' : ''}"
          onclick={() => onselect(recipe.id, 'local')}
        >
          <div class="font-mono text-xs font-medium text-text1 truncate">{recipe.name}</div>
          {#if recipe.description}
            <div class="text-[10px] text-text2 truncate mt-0.5">{recipe.description}</div>
          {/if}
          {#if recipe.servers?.length}
            <div class="flex gap-1 mt-1 flex-wrap">
              {#each recipe.servers as srv}
                <span class="text-[8px] font-mono px-1 py-0.5 rounded bg-surface2 text-text2 border border-border2">{srv}</span>
              {/each}
            </div>
          {/if}
        </button>
      {/each}
    {/if}

    {#if filteredMcp.length > 0}
      <div class="px-2 pt-3 pb-1">
        <span class="text-[9px] font-mono uppercase tracking-wider text-text2">
          MCP Serveur ({filteredMcp.length})
        </span>
      </div>
      {#each filteredMcp as recipe (recipe.name)}
        <button
          class="w-full text-left px-3 py-2 border-b border-border/50 hover:bg-surface2 transition-colors
                 {selectedId === `mcp:${recipe.name}` ? 'bg-accent/10 border-l-2 border-l-accent' : ''}"
          onclick={() => onselect(`mcp:${recipe.name}`, 'mcp')}
        >
          <div class="font-mono text-xs font-medium text-text1 truncate">{recipe.name}</div>
          {#if recipe.description}
            <div class="text-[10px] text-text2 truncate mt-0.5">{recipe.description}</div>
          {/if}
        </button>
      {/each}
    {/if}

    {#if filteredLocal.length === 0 && filteredMcp.length === 0}
      <div class="p-4 text-center text-text2 text-xs font-mono">
        Aucune recette trouvee
      </div>
    {/if}
  </div>
</div>
