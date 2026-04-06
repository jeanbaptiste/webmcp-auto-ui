<script lang="ts">
  export interface ListBlockData { title?: string; items: string[]; }
  interface Props { data: Partial<ListBlockData>; }
  let { data }: Props = $props();
</script>
<div class="p-3 md:p-4">
  {#if data.title}<div class="text-[10px] font-mono text-text2 mb-3 uppercase tracking-widest">{data.title}</div>{/if}
  <ul class="flex flex-col gap-1.5">
    {#each (data.items ?? []) as item}
      <li class="text-sm text-text1 bg-surface2 rounded px-3 py-2 border-l-2 border-accent">{item}</li>
    {/each}
  </ul>
</div>
