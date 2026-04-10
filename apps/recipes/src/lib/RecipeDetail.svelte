<script lang="ts">
  import type { Recipe, McpRecipe } from '@webmcp-auto-ui/agent';

  interface Props {
    recipe: Recipe | null;
    mcpRecipe: McpRecipe | null;
    ontest: () => void;
    testing: boolean;
  }

  let { recipe, mcpRecipe, ontest, testing }: Props = $props();
</script>

{#if recipe}
  <div class="flex flex-col h-full overflow-y-auto p-4 gap-4">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="font-mono text-lg font-medium text-text1">{recipe.name}</h2>
        {#if recipe.description}
          <p class="text-sm text-text2 mt-1">{recipe.description}</p>
        {/if}
      </div>
      <button
        onclick={ontest}
        disabled={testing}
        class="flex-shrink-0 font-mono text-xs px-3 h-8 rounded border border-accent bg-accent/10 text-accent
               hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {testing ? 'en cours...' : 'Tester'}
      </button>
    </div>

    <!-- When -->
    <div class="flex flex-col gap-1">
      <span class="text-[9px] font-mono uppercase tracking-wider text-text2">Quand utiliser</span>
      <div class="text-xs font-mono text-text1 bg-surface2 rounded px-3 py-2 border border-border2">
        {recipe.when}
      </div>
    </div>

    <!-- Components -->
    {#if recipe.components_used?.length}
      <div class="flex flex-col gap-1">
        <span class="text-[9px] font-mono uppercase tracking-wider text-text2">Composants</span>
        <div class="flex gap-1 flex-wrap">
          {#each recipe.components_used as comp}
            <span class="font-mono text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
              {comp}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Servers -->
    {#if recipe.servers?.length}
      <div class="flex flex-col gap-1">
        <span class="text-[9px] font-mono uppercase tracking-wider text-text2">Serveurs requis</span>
        <div class="flex gap-1 flex-wrap">
          {#each recipe.servers as srv}
            <span class="font-mono text-[10px] px-2 py-0.5 rounded bg-teal/10 text-teal border border-teal/20">
              {srv}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Layout -->
    {#if recipe.layout}
      <div class="flex flex-col gap-1">
        <span class="text-[9px] font-mono uppercase tracking-wider text-text2">Layout</span>
        <div class="text-xs font-mono text-text2 bg-surface2 rounded px-3 py-2 border border-border2">
          type: {recipe.layout.type}
          {#if recipe.layout.columns}, columns: {recipe.layout.columns}{/if}
          {#if recipe.layout.arrangement}, arrangement: {recipe.layout.arrangement}{/if}
        </div>
      </div>
    {/if}

    <!-- Interactions -->
    {#if recipe.interactions?.length}
      <div class="flex flex-col gap-1">
        <span class="text-[9px] font-mono uppercase tracking-wider text-text2">Interactions</span>
        <div class="flex flex-col gap-1">
          {#each recipe.interactions as inter}
            <div class="text-[10px] font-mono text-text2 bg-surface2 rounded px-2 py-1 border border-border2">
              {inter.source} --[{inter.event}]--> {inter.target}: {inter.action}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Body (markdown) -->
    <div class="flex flex-col gap-1">
      <span class="text-[9px] font-mono uppercase tracking-wider text-text2">Body</span>
      <pre class="text-xs font-mono text-text1 bg-surface2 rounded px-3 py-2 border border-border2
                  whitespace-pre-wrap break-words overflow-x-auto max-h-[400px] overflow-y-auto">{recipe.body}</pre>
    </div>
  </div>
{:else if mcpRecipe}
  <div class="flex flex-col h-full overflow-y-auto p-4 gap-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="font-mono text-lg font-medium text-text1">{mcpRecipe.name}</h2>
        {#if mcpRecipe.description}
          <p class="text-sm text-text2 mt-1">{mcpRecipe.description}</p>
        {/if}
      </div>
      <button
        onclick={ontest}
        disabled={testing}
        class="flex-shrink-0 font-mono text-xs px-3 h-8 rounded border border-accent bg-accent/10 text-accent
               hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {testing ? 'en cours...' : 'Tester'}
      </button>
    </div>
    <p class="text-xs text-text2 font-mono">Recette MCP distante. Cliquez Tester pour l'executer via l'agent.</p>
  </div>
{:else}
  <div class="flex items-center justify-center h-full text-text2 font-mono text-sm">
    Selectionnez une recette
  </div>
{/if}
