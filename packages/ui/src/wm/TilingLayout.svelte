<script lang="ts">
  import type { Snippet } from 'svelte';
  import { computeTilingLayout, assignWeights } from '../lib/wm-layouts.js';
  import type { ManagedWindow, LayoutWindow } from '../lib/wm-layouts.js';
  interface Props { windows: ManagedWindow[]; gap?: number; ratio?: number; padding?: number; children: Snippet<[ManagedWindow, LayoutWindow]>; }
  let { windows, gap=4, ratio=0.6, padding=0, children }: Props = $props();
  let el = $state<HTMLDivElement|null>(null);
  let cw = $state(0), ch = $state(0);
  const weighted = $derived(assignWeights(windows));
  const layout = $derived(cw>0&&ch>0 ? computeTilingLayout(weighted,{containerWidth:cw,containerHeight:ch,gap,ratio,padding}) : []);
  const lmap = $derived(new Map(layout.map(lw=>[lw.id,lw])));
  $effect(()=>{ if(!el)return; const ro=new ResizeObserver(e=>{const r=e[0];if(r){cw=r.contentRect.width;ch=r.contentRect.height;}}); ro.observe(el); return()=>ro.disconnect(); });
</script>
<div class="relative w-full h-full overflow-hidden" bind:this={el}>
  {#each weighted as win (win.id)}
    {@const lw=lmap.get(win.id)}
    {#if lw&&lw.visible}
      <div class="absolute" style="left:{lw.x}px;top:{lw.y}px;width:{lw.width}px;height:{lw.height}px;z-index:{lw.zIndex};">
        {@render children(win,lw)}
      </div>
    {/if}
  {/each}
</div>
