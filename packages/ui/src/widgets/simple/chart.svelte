<svelte:options customElement={{ tag: 'auto-chart', shadow: 'none' }} />

<script lang="ts">
  export interface ChartData {
    title?: string;
    bars?: [string, number][];
  }

  interface Props {
    data?: ChartData | null;
  }

  let { data = {} }: Props = $props();

  const title = $derived(data?.title);
  const bars = $derived(data?.bars ?? []);
  const max = $derived(Math.max(...bars.map((b) => b[1]), 1));
</script>

<div class="p-3 md:p-4">
  {#if title}
    <div class="text-[10px] font-mono text-text2 mb-4 uppercase tracking-widest">{title}</div>
  {/if}
  <div class="flex items-end gap-1.5 h-32" role="img" aria-label={title ?? 'Bar chart'}>
    {#each bars as [label, val]}
      <div
        class="flex-1 rounded-t bg-accent opacity-80 hover:opacity-100 transition-all"
        style="height: max(2px, {Math.round((val / max) * 100)}%)"
        title="{label}: {val}"
      ></div>
    {/each}
  </div>
  <div class="flex gap-1.5 mt-1" aria-hidden="true">
    {#each bars as [label]}
      <span class="flex-1 text-center text-[9px] font-mono text-text2 truncate">{label}</span>
    {/each}
  </div>
</div>
