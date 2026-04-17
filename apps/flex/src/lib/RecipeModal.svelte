<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { MarkdownView } from '@webmcp-auto-ui/ui';

  interface RecipeData {
    id?: string;
    name?: string;
    description?: string;
    when?: string;
    components_used?: string[];
    servers?: string[];
    serverName?: string;
    layout?: { type: string; columns?: number; arrangement?: string };
    body?: string;
  }

  interface Props {
    open: boolean;
    recipe: RecipeData | null;
    onclose: () => void;
  }

  let { open = $bindable(false), recipe, onclose }: Props = $props();

  /** True when the recipe is an MCP recipe (no body/when/layout — only name+description) */
  const isMcpRecipe = $derived(
    recipe != null && !recipe.body && !recipe.when && !recipe.layout
  );

  function close() { open = false; onclose(); }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open && recipe}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-10"
    transition:fade={{ duration: 180 }}
    onclick={(e) => { if (e.target === e.currentTarget) close(); }}
  >
    <div
      class="w-full max-w-2xl max-h-full bg-surface border border-border2 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
      transition:fly={{ y: 24, duration: 240 }}
    >
      <!-- Header -->
      <div class="flex items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0">
        <span class="font-mono text-sm font-bold text-text1 flex-1 truncate">{recipe.name ?? recipe.id ?? 'Sans nom'}</span>
        <button class="text-text2 hover:text-text1 font-mono text-base leading-none transition-colors"
                onclick={close}>x</button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

        {#if recipe.description}
          <p class="font-mono text-xs text-text2 leading-relaxed">{recipe.description}</p>
        {/if}

        {#if recipe.when}
          <div>
            <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1">Quand utiliser</div>
            <p class="font-mono text-xs text-text1 leading-relaxed">{recipe.when}</p>
          </div>
        {/if}

        {#if recipe.components_used && recipe.components_used.length > 0}
          <div>
            <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1.5">Composants</div>
            <div class="flex flex-wrap gap-1.5">
              {#each recipe.components_used as comp}
                <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono border border-accent/40 text-accent bg-accent/5">{comp}</span>
              {/each}
            </div>
          </div>
        {/if}

        {#if recipe.servers && recipe.servers.length > 0}
          <div>
            <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1.5">Serveurs</div>
            <div class="flex flex-wrap gap-1.5">
              {#each recipe.servers as server}
                <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono border border-teal/40 text-teal bg-teal/5">{server}</span>
              {/each}
            </div>
          </div>
        {/if}

        {#if recipe.layout}
          <div>
            <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1">Layout</div>
            <p class="font-mono text-xs text-text1">
              {recipe.layout.type}{#if recipe.layout.columns}, {recipe.layout.columns} colonnes{/if}{#if recipe.layout.arrangement} — {recipe.layout.arrangement}{/if}
            </p>
          </div>
        {/if}

        {#if recipe.body}
          <div>
            <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-2">Contenu</div>
            <MarkdownView source={recipe.body} />
          </div>
        {/if}

        {#if isMcpRecipe}
          <div class="mt-2 px-3 py-2 rounded border border-accent/20 bg-accent/5">
            <p class="font-mono text-[10px] text-text2 leading-relaxed">
              Recette MCP distante. Appelle <code class="text-accent">get_recipe('{recipe.name ?? recipe.id ?? ''}')</code> dans le chat pour obtenir les instructions completes.
            </p>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end px-6 py-3 border-t border-border flex-shrink-0">
        <button
          class="font-mono text-xs h-7 px-4 rounded border border-border2 text-text2 hover:text-text1 transition-colors"
          onclick={close}>
          Fermer
        </button>
      </div>
    </div>
  </div>
{/if}

