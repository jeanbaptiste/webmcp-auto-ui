<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { cols?: number | string; gap?: number | string; class?: string; children: Snippet; }
  let { cols = 2, gap = 4, class: cls = '', children }: Props = $props();
  const gtc = $derived(typeof cols === 'number' ? `repeat(${cols}, minmax(0, 1fr))` : (cols as string));
  const gg = $derived(typeof gap === 'number' ? `${(gap as number) * 4}px` : (gap as string));
</script>
<div class="grid {cls}" style="grid-template-columns: {gtc}; gap: {gg};">{@render children()}</div>
