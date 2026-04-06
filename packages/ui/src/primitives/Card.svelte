<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { header?: Snippet; children: Snippet; footer?: Snippet; class?: string; }
  let { header, children, footer, class: cls = '' }: Props = $props();
</script>
<div class="rounded-lg border border-border bg-surface overflow-hidden {cls}">
  {#if header}<div class="border-b border-border px-3 py-2 md:px-4 md:py-3">{@render header()}</div>{/if}
  <div class="p-3 md:p-4">{@render children()}</div>
  {#if footer}<div class="border-t border-border px-4 py-2">{@render footer()}</div>{/if}
</div>
