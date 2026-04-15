<script lang="ts">
  export interface StatBlockData { label: string; value: string; trend?: string; trendDir?: 'up' | 'down' | 'neutral'; }
  interface Props { data: Partial<StatBlockData>; }
  let { data }: Props = $props();
  const trendColor = $derived(data.trendDir === 'up' ? 'text-teal' : data.trendDir === 'down' ? 'text-accent2' : 'text-text2');
  const trendArrow = $derived(data.trendDir === 'up' ? '↑' : data.trendDir === 'down' ? '↓' : '→');
</script>
<div class="p-4 md:p-5">
  <div class="text-[11px] font-mono text-text2 mb-1 uppercase tracking-widest">{data.label ?? 'Metric'}</div>
  <div class="text-3xl md:text-4xl font-bold text-text1 leading-none">{data.value ?? '—'}</div>
  {#if data.trend}
    <div class="text-xs font-mono mt-2 {trendColor}">{trendArrow} {data.trend}</div>
  {/if}
</div>
