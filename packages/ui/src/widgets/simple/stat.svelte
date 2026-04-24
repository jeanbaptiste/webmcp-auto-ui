<svelte:options customElement={{ tag: 'auto-stat', shadow: 'none' }} />

<script lang="ts">
  export interface StatData {
    label?: string;
    value?: string | number;
    trend?: string;
    trendDir?: 'up' | 'down' | 'neutral';
  }

  interface Props {
    data?: StatData | null;
  }

  let { data = {} }: Props = $props();

  const label = $derived(data?.label ?? 'Metric');
  const value = $derived(data?.value ?? '—');
  const trend = $derived(data?.trend);
  const trendDir = $derived(data?.trendDir);

  const trendColor = $derived(
    trendDir === 'up' ? 'text-teal' : trendDir === 'down' ? 'text-accent2' : 'text-text2',
  );
  const trendArrow = $derived(
    trendDir === 'up' ? '↑' : trendDir === 'down' ? '↓' : '→',
  );
</script>

<div class="p-4 md:p-5">
  <div class="text-[11px] font-mono text-text2 mb-1 uppercase tracking-widest">{label}</div>
  <div class="text-3xl md:text-4xl font-bold text-text1 leading-none">{value}</div>
  {#if trend}
    <div class="text-xs font-mono mt-2 {trendColor}">{trendArrow} {trend}</div>
  {/if}
</div>
