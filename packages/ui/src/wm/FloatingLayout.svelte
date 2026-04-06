<script lang="ts">
  import type { Snippet } from 'svelte';
  import { computeFloatingLayout, bringToFront } from '../lib/wm-layouts.js';
  import type { ManagedWindow, LayoutWindow, FloatingWindowState } from '../lib/wm-layouts.js';
  interface Props { windows: ManagedWindow[]; gap?: number; defaultWidth?: number; defaultHeight?: number; children: Snippet<[ManagedWindow, LayoutWindow, {onmove:(id:string,x:number,y:number)=>void}]>; }
  let { windows, gap=4, defaultWidth=400, defaultHeight=300, children }: Props = $props();
  let el = $state<HTMLDivElement|null>(null);
  let cw=$state(0),ch=$state(0);
  let saved=$state(new Map<string,FloatingWindowState>());
  let layout=$state<LayoutWindow[]>([]);
  $effect(()=>{ if(cw===0||ch===0)return; layout=computeFloatingLayout(windows,{containerWidth:cw,containerHeight:ch,gap,defaultWidth,defaultHeight},saved); });
  const lmap=$derived(new Map(layout.map(lw=>[lw.id,lw])));
  function focus(id:string){layout=bringToFront(layout,id);}
  function move(id:string,x:number,y:number){const lw=lmap.get(id);if(!lw)return;saved=new Map(saved).set(id,{x,y,width:lw.width,height:lw.height,zIndex:lw.zIndex});layout=layout.map(w=>w.id===id?{...w,x,y}:w);focus(id);}
  let drag=$state<string|null>(null),dsx=$state(0),dsy=$state(0),wsx=$state(0),wsy=$state(0);
  function dragStart(id:string,e:MouseEvent){drag=id;dsx=e.clientX;dsy=e.clientY;const lw=lmap.get(id);wsx=lw?.x??0;wsy=lw?.y??0;focus(id);}
  function mm(e:MouseEvent){if(!drag)return;const lw=lmap.get(drag);if(!lw)return;const nx=Math.max(0,Math.min(cw-lw.width,wsx+e.clientX-dsx)),ny=Math.max(0,Math.min(ch-lw.height,wsy+e.clientY-dsy));move(drag,nx,ny);}
  function mu(){drag=null;}
  $effect(()=>{ if(!el)return; const ro=new ResizeObserver(e=>{const r=e[0];if(r){cw=r.contentRect.width;ch=r.contentRect.height;}}); ro.observe(el); return()=>ro.disconnect(); });
</script>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative w-full h-full overflow-hidden" bind:this={el} onmousemove={mm} onmouseup={mu} onmouseleave={mu}>
  {#each windows as win (win.id)}
    {@const lw=lmap.get(win.id)}
    {#if lw&&lw.visible}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute" style="left:{lw.x}px;top:{lw.y}px;width:{lw.width}px;height:{lw.height}px;z-index:{lw.zIndex};" onmousedown={()=>focus(win.id)}>
        {@render children(win,lw,{onmove:(id,x,y)=>move(id,x,y)})}
      </div>
    {/if}
  {/each}
</div>
