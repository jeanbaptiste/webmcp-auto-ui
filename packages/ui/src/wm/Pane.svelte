<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { id: string; title: string; badge?: string; folded?: boolean; onfold?: (id: string) => void; onclose?: (id: string) => void; onfocus?: (id: string) => void; children: Snippet; }
  let { id, title, badge='', folded=false, onfold, onclose, onfocus, children }: Props = $props();
</script>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex flex-col h-full bg-[#13131a] rounded-lg border border-white/[0.07] overflow-hidden" onmousedown={()=>onfocus?.(id)}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.07] cursor-pointer select-none shrink-0" onclick={()=>onfold?.(id)}>
    <h3 class="text-xs font-mono text-zinc-400 flex-1 truncate">{title}</h3>
    {#if badge}<span class="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-[#7c6dfa]/20 text-[#7c6dfa] font-semibold font-mono">{badge}</span>{/if}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <button class="w-5 h-5 flex items-center justify-center rounded text-zinc-600 hover:bg-[#fa6d7c]/20 hover:text-[#fa6d7c] text-sm leading-none" onclick={(e)=>{e.stopPropagation();onclose?.(id);}}>×</button>
  </div>
  {#if !folded}<div class="flex-1 overflow-auto p-2 min-h-0">{@render children()}</div>{/if}
</div>
