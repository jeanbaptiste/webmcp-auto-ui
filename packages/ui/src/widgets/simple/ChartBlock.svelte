<script lang="ts">
  export interface ChartBlockData { title?: string; bars: [string, number][]; }
  interface Props { data: Partial<ChartBlockData>; }
  let { data }: Props = $props();
  const bars = $derived(data.bars ?? []);
  const max = $derived(Math.max(...bars.map(b => b[1]), 1));
</script>
<div class="p-3 md:p-4">
  {#if data.title}<div class="text-[10px] font-mono text-text2 mb-4 uppercase tracking-widest">{data.title}</div>{/if}
  <div class="flex items-end gap-1.5 h-32">
    {#each bars as [, val]}
      <div class="flex-1 rounded-t bg-accent opacity-80 hover:opacity-100 transition-all"
        style="height: max(2px, {Math.round(val / max * 100)}%)"></div>
    {/each}
  </div>
  <div class="flex gap-1.5 mt-1">
    {#each bars as [label]}
      <span class="flex-1 text-center text-[9px] font-mono text-text2 truncate">{label}</span>
    {/each}
  </div>
</div>
