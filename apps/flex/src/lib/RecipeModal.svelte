<script lang="ts">
  import { tick } from 'svelte';
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, MarkdownView } from '@webmcp-auto-ui/ui';
  import type { McpMultiClient } from '@webmcp-auto-ui/core';
  import { parseBody, runCode } from '@webmcp-auto-ui/sdk';
  import type { RecipeData, RunResult, RunTab } from '@webmcp-auto-ui/sdk';
  import RecipeCodeBlock from './RecipeCodeBlock.svelte';
  import RecipeRunModal from './RecipeRunModal.svelte';

  interface Props {
    open: boolean;
    recipe: RecipeData | null;
    onclose: () => void;
    /** If provided and found in a segment's content, scroll to and briefly highlight that segment. */
    anchorText?: string;
  }

  let { open = $bindable(false), recipe, onclose, anchorText = undefined }: Props = $props();

  /** True when the recipe is an MCP recipe (no body/when/layout — only name+description) */
  const isMcpRecipe = $derived(
    recipe != null && !recipe.body && !recipe.when && !recipe.layout
  );

  const segments = $derived(recipe?.body ? parseBody(recipe.body) : []);

  // When opened with an anchorText, find the first matching segment, scroll it
  // into view, and briefly highlight it with a ring.
  $effect(() => {
    if (!open || !anchorText || segments.length === 0) return;
    const needle = anchorText.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!needle) return;
    const matchIdx = segments.findIndex((s) =>
      s.content.replace(/\s+/g, ' ').toLowerCase().includes(needle)
    );
    if (matchIdx < 0) {
      console.warn('[RecipeModal] anchor not found in segments:', needle.slice(0, 60));
      return;
    }
    let cleanup: (() => void) | undefined;
    (async () => {
      await tick();
      // Extra micro-delay so transitions settle before measuring
      await new Promise((r) => setTimeout(r, 60));
      const el = document.querySelector<HTMLElement>(`[data-segment-idx="${matchIdx}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-accent', 'rounded');
      const t = setTimeout(() => {
        el.classList.remove('ring-2', 'ring-accent', 'rounded');
      }, 2000);
      cleanup = () => clearTimeout(t);
    })();
    return () => { cleanup?.(); };
  });

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
    const multi = (globalThis as unknown as { __multiMcp?: { multiClient: McpMultiClient } }).__multiMcp?.multiClient;
    const result = await runCode(tab.code, tab.lang, multi);
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

  // Show side panel only when we have runs AND viewport supports it
  const showSidePanel = $derived(runModalOpen && sideBySide);
  const showInlinePanel = $derived(runModalOpen && !sideBySide);
</script>

<Dialog bind:open onOpenChange={(v) => { if (!v) close(); }}>
  <DialogContent
    class="!p-0 !rounded-2xl !max-h-[90vh] overflow-visible {showSidePanel ? '!max-w-[1400px] !w-[calc(100vw-3rem)] flex gap-4' : '!max-w-[42rem] !w-[calc(100vw-3rem)] flex'}"
  >
    <!-- Recipe panel -->
    <div
      class="bg-surface border border-border2 rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]"
      style={showSidePanel
        ? `flex: ${splitRatio === '50/50' ? '1 1 50%' : '1 1 60%'}; min-width: 0;`
        : 'flex: 1 1 100%; min-width: 0;'}
    >
      <!-- Header -->
      <DialogHeader class="flex-row items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0 !mb-0">
        <DialogTitle class="!text-sm !font-bold flex-1 truncate">{recipe?.name ?? recipe?.id ?? 'Untitled'}</DialogTitle>
      </DialogHeader>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

        {#if recipe?.description}
          <p class="font-mono text-xs text-text2 leading-relaxed">{recipe.description}</p>
        {/if}

        {#if recipe?.when}
          <div>
            <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1">When to use</div>
            <p class="font-mono text-xs text-text1 leading-relaxed">{recipe.when}</p>
          </div>
        {/if}

        {#if recipe?.components_used && recipe.components_used.length > 0}
          <div>
            <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1.5">Components</div>
            <div class="flex flex-wrap gap-1.5">
              {#each recipe.components_used as comp}
                <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono border border-accent/40 text-accent bg-accent/5">{comp}</span>
              {/each}
            </div>
          </div>
        {/if}

        {#if recipe?.servers && recipe.servers.length > 0}
          <div>
            <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1.5">Servers</div>
            <div class="flex flex-wrap gap-1.5">
              {#each recipe.servers as server}
                <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono border border-teal/40 text-teal bg-teal/5">{server}</span>
              {/each}
            </div>
          </div>
        {/if}

        {#if recipe?.layout}
          <div>
            <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-1">Layout</div>
            <p class="font-mono text-xs text-text1">
              {recipe.layout.type}{#if recipe.layout.columns}, {recipe.layout.columns} columns{/if}{#if recipe.layout.arrangement} — {recipe.layout.arrangement}{/if}
            </p>
          </div>
        {/if}

        {#if recipe?.body}
          <div>
            <div class="text-[9px] font-mono text-text2 uppercase tracking-wider mb-2">Content</div>
            <div class="flex flex-col">
              {#each segments as seg, i (i)}
                <div data-segment-idx={i} class="transition-shadow">
                  {#if seg.type === 'markdown'}
                    <MarkdownView source={seg.content} />
                  {:else}
                    <RecipeCodeBlock
                      code={seg.content}
                      lang={seg.lang ?? 'text'}
                      onrun={(payload) => handleBlockRun(i, payload)}
                    />
                  {/if}
                </div>
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
              Remote MCP recipe. Call <code class="text-accent">get_recipe('{recipe?.name ?? recipe?.id ?? ''}')</code> in the chat to get the full instructions.
            </p>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <DialogFooter class="px-6 py-3 border-t border-border flex-shrink-0 !mt-0">
        <button
          class="font-mono text-xs h-7 px-4 rounded border border-border2 text-text2 hover:text-text1 transition-colors"
          onclick={close}>
          Close
        </button>
      </DialogFooter>
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
  </DialogContent>
</Dialog>
