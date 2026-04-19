<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { MarkdownView } from '@webmcp-auto-ui/ui';
  import type { McpMultiClient } from '@webmcp-auto-ui/core';
  import { parseBody } from './recipes/parse.js';
  import { runCode } from './recipes/runner.js';
  import type { RecipeData, RunResult, RunTab } from './recipes/types.js';
  import RecipeCodeBlock from './RecipeCodeBlock.svelte';
  import RecipeRunModal from './RecipeRunModal.svelte';

  interface Props {
    open: boolean;
    recipe: RecipeData | null;
    onclose: () => void;
    multiClient?: McpMultiClient;
  }

  let { open = $bindable(false), recipe, onclose, multiClient }: Props = $props();

  /** True when the recipe is an MCP recipe (no body/when/layout — only name+description) */
  const isMcpRecipe = $derived(
    recipe != null && !recipe.body && !recipe.when && !recipe.layout
  );

  const segments = $derived(recipe?.body ? parseBody(recipe.body) : []);

  // Viewport width tracking for responsive layout
  let viewportW = $state(typeof window !== 'undefined' ? window.innerWidth : 1200);
  $effect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => { viewportW = window.innerWidth; };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  });

  const sideBySide = $derived(viewportW >= 700);
  const splitRatio = $derived(viewportW >= 1100 ? '50/50' : '60/40');

  // Run tabs (one per executed block)
  let runs = $state<RunTab[]>([]);
  let activeTabId = $state<string | null>(null);
  let runModalOpen = $state(false);

  // Reset runs when the recipe changes
  $effect(() => {
    // touch recipe.id / name so the effect reruns
    const _ = recipe?.id ?? recipe?.name;
    runs = [];
    activeTabId = null;
    runModalOpen = false;
  });

  function tabIdFor(index: number, lang: string): string {
    return `run-${index}-${lang}`;
  }

  function labelFor(index: number, lang: string): string {
    const ext = lang && lang !== 'text' ? lang : 'code';
    return `${ext}#${index + 1}`;
  }

  function handleBlockRun(index: number, payload: { code: string; lang: string; result: RunResult }) {
    const id = tabIdFor(index, payload.lang);
    const label = labelFor(index, payload.lang);
    const existing = runs.findIndex((r) => r.id === id);
    const tab: RunTab = { id, label, lang: payload.lang, code: payload.code, result: payload.result };
    if (existing >= 0) {
      runs[existing] = tab;
      runs = [...runs];
    } else {
      runs = [...runs, tab];
    }
    activeTabId = id;
    runModalOpen = true;
  }

  async function handleReplay(tabId: string) {
    const idx = runs.findIndex((r) => r.id === tabId);
    if (idx < 0) return;
    const tab = runs[idx];
    // mark running
    runs[idx] = {
      ...tab,
      result: { status: 'running', logs: [], startedAt: performance.now() },
    };
    runs = [...runs];
    const result = await runCode(tab.code, tab.lang, multiClient);
    runs[idx] = { ...tab, result };
    runs = [...runs];
  }

  function closeRunModal() {
    runModalOpen = false;
  }

  function close() {
    open = false;
    runModalOpen = false;
    onclose();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (runModalOpen) { runModalOpen = false; return; }
      close();
    }
  }

  // Show side panel only when we have runs AND viewport supports it
  const showSidePanel = $derived(runModalOpen && sideBySide);
  const showInlinePanel = $derived(runModalOpen && !sideBySide);
</script>

<svelte:window onkeydown={onKeydown} />

{#if open && recipe}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
    transition:fade={{ duration: 180 }}
    onclick={(e) => { if (e.target === e.currentTarget) close(); }}
  >
    <div
      class="flex gap-4 max-h-full w-full"
      style={showSidePanel
        ? `max-width: 1400px; ${splitRatio === '50/50' ? '' : ''}`
        : 'max-width: 42rem;'}
      transition:fly={{ y: 24, duration: 240 }}
    >
      <!-- Recipe panel -->
      <div
        class="bg-surface border border-border2 rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]"
        style={showSidePanel
          ? `flex: ${splitRatio === '50/50' ? '1 1 50%' : '1 1 60%'}; min-width: 0;`
          : 'flex: 1 1 100%; min-width: 0;'}
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
              <div class="flex flex-col">
                {#each segments as seg, i (i)}
                  {#if seg.type === 'markdown'}
                    <MarkdownView source={seg.content} />
                  {:else}
                    <RecipeCodeBlock
                      code={seg.content}
                      lang={seg.lang ?? 'text'}
                      {multiClient}
                      onrun={(payload) => handleBlockRun(i, payload)}
                    />
                  {/if}
                {/each}
              </div>

              {#if showInlinePanel}
                <div class="mt-3">
                  <RecipeRunModal
                    open={runModalOpen}
                    {runs}
                    {activeTabId}
                    inline={true}
                    onclose={closeRunModal}
                    onreplay={handleReplay}
                    onselectTab={(id) => (activeTabId = id)}
                  />
                </div>
              {/if}
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

      <!-- Side Run panel (desktop / medium) -->
      {#if showSidePanel}
        <div
          class="max-h-[90vh]"
          style={`flex: ${splitRatio === '50/50' ? '1 1 50%' : '1 1 40%'}; min-width: 0; display: flex;`}
        >
          <RecipeRunModal
            open={runModalOpen}
            {runs}
            {activeTabId}
            inline={false}
            onclose={closeRunModal}
            onreplay={handleReplay}
            onselectTab={(id) => (activeTabId = id)}
          />
        </div>
      {/if}
    </div>
  </div>
{/if}
