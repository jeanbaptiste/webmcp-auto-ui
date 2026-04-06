<script lang="ts">
  export interface StatBlockData { label: string; value: string; trend?: string; trendDir?: 'up' | 'down' | 'neutral'; }
  interface Props { data: Partial<StatBlockData>; }
  let { data }: Props = $props();
  const trendColor = $derived(data.trendDir === 'up' ? 'text-[#3ecfb2]' : data.trendDir === 'down' ? 'text-[#fa6d7c]' : 'text-zinc-500');
  const trendArrow = $derived(data.trendDir === 'up' ? '↑' : data.trendDir === 'down' ? '↓' : '→');
</script>
<div class="p-5">
  <div class="text-[11px] font-mono text-zinc-600 mb-1 uppercase tracking-widest">{data.label ?? 'Métrique'}</div>
  <div class="text-4xl font-bold text-white leading-none">{data.value ?? '—'}</div>
  {#if data.trend}
    <div class="text-xs font-mono mt-2 {trendColor}">{trendArrow} {data.trend}</div>
  {/if}
</div>
