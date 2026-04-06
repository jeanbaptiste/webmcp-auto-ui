<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props { items: unknown[]; item: Snippet<[unknown, number]>; empty?: Snippet; class?: string; maxHeight?: string; }
  let { items, item, empty, class: cls = '', maxHeight = 'none' }: Props = $props();
</script>
<div class="overflow-y-auto divide-y divide-border {cls}" style="max-height: {maxHeight};">
  {#if items.length === 0}
    {#if empty}{@render empty()}{:else}<p class="py-4 text-center text-sm text-text2">Aucun élément</p>{/if}
  {:else}
    {#each items as it, i (i)}{@render item(it, i)}{/each}
  {/if}
</div>
