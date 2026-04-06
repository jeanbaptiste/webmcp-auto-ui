<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { title?: string; class?: string; children: Snippet; }
  let { title, class: cls = '', children }: Props = $props();
</script>
<div class="flex flex-col bg-surface border border-border rounded-lg overflow-hidden {cls}">
  {#if title}
    <div class="px-4 py-2 bg-surface2/50 border-b border-border shrink-0">
      <h4 class="text-[10px] font-mono font-medium text-text2 uppercase tracking-widest">{title}</h4>
    </div>
  {/if}
  <div class="flex-1 overflow-y-auto min-h-0 p-3 md:p-4">{@render children()}</div>
</div>
