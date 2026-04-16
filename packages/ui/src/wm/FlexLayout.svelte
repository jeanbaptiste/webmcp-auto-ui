<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ManagedWindow, LayoutWindow } from '../lib/wm-layouts.js';

  interface FlexCtx {
    scale: number;
  }

  interface Props {
    windows: ManagedWindow[];
    minWidth?: number;
    maxWidth?: number;
    gap?: number;
    showSlider?: boolean;
    children: Snippet<[ManagedWindow, LayoutWindow, FlexCtx]>;
  }

  let { windows, minWidth = 280, maxWidth = 800, gap = 8, showSlider = true, children }: Props = $props();

  let el = $state<HTMLDivElement | null>(null);
  let cw = $state(0);

  // Scale: 0 = minWidth, 1 = maxWidth
  let scale = $state(0.3);
  const currentMinW = $derived(Math.round(minWidth + scale * (maxWidth - minWidth)));
  const mobile = $derived(cw > 0 && cw < 640);

  $effect(() => {
    if (!el) return;
    const ro = new ResizeObserver(e => { const r = e[0]; if (r) { cw = r.contentRect.width; } });
    ro.observe(el);
    return () => ro.disconnect();
  });

  function makeLw(win: ManagedWindow): LayoutWindow {
    return { id: win.id, x: 0, y: 0, width: currentMinW, height: 0, zIndex: 1, visible: true, folded: win.folded };
  }
</script>

<div class="relative w-full h-full overflow-y-auto" bind:this={el}>

  {#if cw > 0}
    {#if showSlider && !mobile}
      <div class="sticky top-0 z-10 flex items-center justify-end px-3 py-1.5 gap-2">
        <label class="flex items-center gap-2 font-mono text-[10px] text-text2 select-none">
          <span>Size</span>
          <input type="range" min="0" max="1" step="0.01"
                 bind:value={scale}
                 class="w-24 h-1 accent-[var(--color-accent,#6366f1)]" />
          <span class="w-10 text-right tabular-nums">{currentMinW}px</span>
        </label>
      </div>
    {/if}

    {#if mobile}
      <div class="flex flex-col gap-3 p-2">
        {#each windows as win (win.id)}
          {#if win.visible !== false}
            {@const lw = { id: win.id, x: 0, y: 0, width: cw, height: 0, zIndex: 1, visible: true, folded: win.folded }}
            <div>
              {@render children(win, lw, { scale })}
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="flex-grid" style="--min-w:{currentMinW}px;--gap:{gap}px;">
        {#each windows as win (win.id)}
          {#if win.visible !== false}
            {@const lw = makeLw(win)}
            <div class="flex-grid-item rounded-lg">
              {@render children(win, lw, { scale })}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  {/if}

</div>

<style>
  .flex-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--min-w), 1fr));
    grid-auto-rows: 280px;
    gap: var(--gap);
    padding: var(--gap);
  }
  .flex-grid-item {
    transition: all 0.2s ease;
    min-height: 0;
  }
</style>
