<script lang="ts">
  interface Props {
    open: boolean;
    serverName: string;
    serverUrl: string;
    tools: { name: string; description?: string }[];
    recipes?: { name: string; description?: string }[];
    ondisconnect?: () => void;
  }

  let {
    open = $bindable(false),
    serverName,
    serverUrl,
    tools = [],
    recipes = [],
    ondisconnect,
  }: Props = $props();

  function close() {
    open = false;
  }
</script>

{#if open}
  <!-- Overlay -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onclick={close}>
    <!-- Modal -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-surface border border-border2 rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center gap-2 px-5 py-4 border-b border-border flex-shrink-0">
        <span class="w-2 h-2 rounded-full bg-teal flex-shrink-0"></span>
        <span class="font-mono text-sm font-bold text-text1 flex-1 truncate">{serverName}</span>
        <button
          class="text-text2 hover:text-text1 text-lg leading-none transition-colors"
          onclick={close}
        >&#10005;</button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        <!-- URL -->
        <div class="font-mono text-[10px] text-text2 break-all">{serverUrl}</div>

        <!-- Tools -->
        {#if tools.length > 0}
          <section>
            <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-2">
              Outils ({tools.length})
            </div>
            <div class="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
              {#each tools as tool}
                <div class="flex flex-col gap-0.5">
                  <span class="font-mono text-xs text-text1">{tool.name}</span>
                  {#if tool.description}
                    <span class="font-mono text-[10px] text-text2 line-clamp-2">{tool.description}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Recipes -->
        {#if recipes && recipes.length > 0}
          <section>
            <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-2">
              Recettes ({recipes.length})
            </div>
            <div class="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto">
              {#each recipes as recipe}
                <div class="flex flex-col gap-0.5">
                  <span class="font-mono text-xs text-text1">{recipe.name}</span>
                  {#if recipe.description}
                    <span class="font-mono text-[10px] text-text2 line-clamp-2">{recipe.description}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </section>
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-5 py-4 border-t border-border flex-shrink-0">
        <button
          class="w-full font-mono text-xs py-2 rounded-lg border border-accent2/40 text-accent2 hover:bg-accent2/10 transition-colors"
          onclick={() => { ondisconnect?.(); close(); }}
        >
          Deconnecter
        </button>
      </div>
    </div>
  </div>
{/if}
