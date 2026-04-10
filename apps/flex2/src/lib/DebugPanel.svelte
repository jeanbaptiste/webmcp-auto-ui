<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { ToolLayer } from '@webmcp-auto-ui/agent';

  interface Props {
    prompt: string;
    layers: ToolLayer[];
    toolMode: 'smart' | 'explicit';
  }
  let { prompt, layers, toolMode }: Props = $props();

  let visible = $state(false);

  function onKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      visible = !visible;
    }
  }

  onMount(() => window.addEventListener('keydown', onKeydown));
  onDestroy(() => window.removeEventListener('keydown', onKeydown));

  // Rough token estimate: ~4 chars per token
  const estimatedTokens = $derived(Math.round(prompt.length / 4));

  const toolCount = $derived(
    layers.reduce((sum, l) => sum + ('tools' in l && l.tools ? l.tools.length : 0), 0)
  );

  const recipeCount = $derived(
    layers.reduce((sum, l) => sum + ('recipes' in l && l.recipes ? l.recipes.length : 0), 0)
  );
</script>

{#if visible}
  <div class="debug-panel">
    <div class="flex items-center justify-between mb-3">
      <span class="font-bold text-xs text-accent">Debug Panel</span>
      <button class="text-text2 hover:text-text1 text-sm" onclick={() => visible = false}>x</button>
    </div>

    <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] mb-3">
      <span class="text-text2">Mode</span>
      <span class="text-text1">{toolMode}</span>
      <span class="text-text2">Prompt tokens (est.)</span>
      <span class="text-text1">{estimatedTokens.toLocaleString()}</span>
      <span class="text-text2">Active layers</span>
      <span class="text-text1">{layers.length}</span>
      <span class="text-text2">Tools sent</span>
      <span class="text-text1">{toolCount}</span>
      <span class="text-text2">Recipes</span>
      <span class="text-text1">{recipeCount}</span>
    </div>

    <div class="text-[9px] text-text2 uppercase tracking-wider mb-1">Layers</div>
    <div class="flex flex-col gap-1 mb-3">
      {#each layers as layer, i}
        <div class="text-[10px] font-mono text-text1 px-2 py-1 bg-surface2/50 rounded">
          [{i}] {layer.source}
          {#if 'serverName' in layer && layer.serverName}
            — {layer.serverName}
          {/if}
          {#if 'tools' in layer && layer.tools}
            ({layer.tools.length} tools)
          {/if}
        </div>
      {/each}
    </div>

    <div class="text-[9px] text-text2 uppercase tracking-wider mb-1">System Prompt</div>
    <pre class="text-[9px] text-text1 bg-surface2/50 rounded p-2 max-h-[300px] overflow-auto whitespace-pre-wrap break-all">{prompt}</pre>
  </div>
{/if}

<style>
  .debug-panel {
    position: fixed;
    top: 48px;
    right: 0;
    width: 380px;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border2);
    border-bottom: 1px solid var(--color-border2);
    box-shadow: -4px 4px 24px rgba(0,0,0,0.15);
    z-index: 60;
    padding: 12px 16px;
    font-family: 'IBM Plex Mono', monospace;
  }
</style>
