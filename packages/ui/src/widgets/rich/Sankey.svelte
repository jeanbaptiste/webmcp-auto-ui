<script lang="ts">
  export interface SankeyNode { id: string; label: string; color?: string; summary?: string; }
  export interface SankeyLink { source: string; target: string; value: number; label?: string; }
  export interface SankeySpec { title?: string; nodes?: SankeyNode[]; links?: SankeyLink[]; }
  interface Props { spec: Partial<SankeySpec>; onnodeclick?: (n: SankeyNode) => void; onlinkclick?: (l: SankeyLink) => void; }
  let { spec, onnodeclick, onlinkclick }: Props = $props();
  let host: HTMLElement | undefined = $state();
  const nodes=$derived<SankeyNode[]>(Array.isArray(spec.nodes)?spec.nodes:[]);
  const links=$derived<SankeyLink[]>(Array.isArray(spec.links)?spec.links:[]);
  const nodeMap=$derived(new Map(nodes.map(n=>[n.id,n])));
  const maxVal=$derived(Math.max(...links.map(l=>l.value),1));
  const sorted=$derived([...links].sort((a,b)=>b.value-a.value));
  function dispatchNodeDblclick(node: SankeyNode | undefined) {
    if (!node || !host) return;
    host.dispatchEvent(new CustomEvent('widget:node-dblclick', {
      detail: { nodeId: node.id, nodeData: node },
      bubbles: true,
    }));
  }
</script>
<div bind:this={host} class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
  {#if spec.title}<h3 class="text-sm font-semibold text-text1 mb-3">{spec.title}</h3>{/if}
  {#if !nodes.length||!links.length}<p class="text-text2 text-sm">No flow data</p>
  {:else}
    <div class="text-xs text-text2 mb-2 font-mono">{nodes.length} nodes · {links.length} flows</div>
    <div class="flex flex-col gap-1.5">
      {#each sorted as link}
        {@const src=nodeMap.get(link.source)}
        {@const tgt=nodeMap.get(link.target)}
        {@const sc=src?.color??'var(--color-accent)'}{@const tc=tgt?.color??'var(--color-teal)'}
        {@const pct=Math.round(link.value/maxVal*100)}
        {@const barH=Math.max(4,Math.round(link.value/maxVal*20))}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="flex items-center gap-2 text-xs cursor-pointer hover:opacity-80 transition-opacity" role="button" tabindex="0" onclick={()=>onlinkclick?.(link)} onkeydown={(e)=>{if(e.key==='Enter')onlinkclick?.(link)}}>
          <span
            class="text-text2 min-w-[80px] truncate font-mono"
            style="color:{sc};"
            title={src?.summary ?? src?.label ?? link.source}
            ondblclick={(e)=>{e.stopPropagation(); dispatchNodeDblclick(src); onnodeclick?.(src!);}}
          >{src?.label??link.source}</span>
          <div class="flex-1 bg-surface2 rounded-full overflow-hidden" style="height:{barH}px;">
            <div class="rounded-full h-full" style="width:{pct}%;background:linear-gradient(to right,{sc},{tc});"></div>
          </div>
          <span
            class="text-text2 min-w-[80px] truncate text-right font-mono"
            style="color:{tc};"
            title={tgt?.summary ?? tgt?.label ?? link.target}
            ondblclick={(e)=>{e.stopPropagation(); dispatchNodeDblclick(tgt); onnodeclick?.(tgt!);}}
          >{tgt?.label??link.target}</span>
          <span class="text-text2 min-w-[40px] text-right font-mono">{link.value}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
