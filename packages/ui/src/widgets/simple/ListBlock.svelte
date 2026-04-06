<script lang="ts">
  export interface ListBlockData { title?: string; items: string[]; }
  interface Props { data: Partial<ListBlockData>; }
  let { data }: Props = $props();
</script>
<div class="p-4">
  {#if data.title}<div class="text-[10px] font-mono text-zinc-600 mb-3 uppercase tracking-widest">{data.title}</div>{/if}
  <ul class="flex flex-col gap-1.5">
    {#each (data.items ?? []) as item}
      <li class="text-sm text-white bg-white/[0.04] rounded px-3 py-2 border-l-2 border-[#7c6dfa]">{item}</li>
    {/each}
  </ul>
</div>
