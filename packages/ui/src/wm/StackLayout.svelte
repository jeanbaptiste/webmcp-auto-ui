<script lang="ts">
  import type { Snippet } from 'svelte';
  import { computeStackLayout } from '../lib/wm-layouts.js';
  import type { ManagedWindow, LayoutWindow } from '../lib/wm-layouts.js';
  interface Props { windows: ManagedWindow[]; mode?: 'single'|'scroll'; gap?: number; padding?: number; children: Snippet<[ManagedWindow, LayoutWindow]>; }
  let { windows, mode='scroll', gap=8, padding=0, children }: Props = $props();
  let el=$state<HTMLDivElement|null>(null);
  let cw=$state(0),ch=$state(0);
  const layout=$derived(cw>0&&ch>0?computeStackLayout(windows,{containerWidth:cw,containerHeight:ch,mode,gap,padding}):[]);
  const lmap=$derived(new Map(layout.map(lw=>[lw.id,lw])));
  $effect(()=>{ if(!el)return; const ro=new ResizeObserver(e=>{const r=e[0];if(r){cw=r.contentRect.width;ch=r.contentRect.height;}}); ro.observe(el); return()=>ro.disconnect(); });
</script>
<div class="relative w-full overflow-y-auto" style="height:100%;" bind:this={el}>
  {#if mode==='scroll'}
    <div class="flex flex-col" style="gap:{gap}px;padding:{padding}px;">
      {#each windows as win (win.id)}
        {@const lw=lmap.get(win.id)}
        {#if lw&&lw.visible}<div style="height:{lw.height}px;flex-shrink:0;">{@render children(win,lw)}</div>{/if}
      {/each}
    </div>
  {:else}
    {#each windows as win (win.id)}
      {@const lw=lmap.get(win.id)}
      {#if lw&&lw.visible}
        <div class="absolute" style="top:{lw.y}px;left:{lw.x}px;width:{lw.width}px;height:{lw.height}px;z-index:{lw.zIndex};">
          {@render children(win,lw)}
        </div>
      {/if}
    {/each}
  {/if}
</div>
