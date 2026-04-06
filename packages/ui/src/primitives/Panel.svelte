<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { title?: string; class?: string; children: Snippet; }
  let { title, class: cls = '', children }: Props = $props();
</script>
<div class="flex flex-col bg-[#13131a] border border-white/[0.07] rounded-lg overflow-hidden {cls}">
  {#if title}
    <div class="px-4 py-2 bg-white/[0.03] border-b border-white/[0.07] shrink-0">
      <h4 class="text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-widest">{title}</h4>
    </div>
  {/if}
  <div class="flex-1 overflow-y-auto min-h-0 p-4">{@render children()}</div>
</div>
