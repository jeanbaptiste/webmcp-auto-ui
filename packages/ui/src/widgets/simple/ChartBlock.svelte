<script lang="ts">
  export interface ChartBlockData { title?: string; bars: [string, number][]; }
  interface Props { data: Partial<ChartBlockData>; }
  let { data }: Props = $props();
  const bars = $derived(data.bars ?? []);
  const max = $derived(Math.max(...bars.map(b => b[1]), 1));
</script>
<div class="p-3 md:p-4">
  {#if data.title}<div class="text-[10px] font-mono text-text2 mb-4 uppercase tracking-widest">{data.title}</div>{/if}
  <div class="flex items-end gap-1.5 h-20">
    {#each bars as [label, val]}
      <div class="flex flex-col items-center gap-1 flex-1">
        <div class="w-full rounded-t bg-accent/80 hover:bg-accent transition-all"
          style="height: {Math.round(val / max * 100)}%"></div>
        <span class="text-[9px] font-mono text-text2">{label}</span>
      </div>
    {/each}
  </div>
</div>
