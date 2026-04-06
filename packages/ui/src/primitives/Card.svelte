<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { header?: Snippet; children: Snippet; footer?: Snippet; class?: string; }
  let { header, children, footer, class: cls = '' }: Props = $props();
</script>
<div class="rounded-lg border border-white/[0.07] bg-[#13131a] overflow-hidden {cls}">
  {#if header}<div class="border-b border-white/[0.07] px-4 py-3">{@render header()}</div>{/if}
  <div class="p-4">{@render children()}</div>
  {#if footer}<div class="border-t border-white/[0.07] px-4 py-2">{@render footer()}</div>{/if}
</div>
