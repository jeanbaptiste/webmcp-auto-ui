<svelte:options customElement={{ tag: 'auto-stat-card', shadow: 'none' }} />

<script lang="ts">
  export interface StatCardTrend { direction: 'up' | 'down' | 'flat'; value?: string; positive?: boolean; }
  export interface StatCardData {
    label?: string;
    value?: unknown;
    unit?: string;
    delta?: string;
    trend?: 'up' | 'down' | 'flat' | StatCardTrend;
    previousValue?: unknown;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  }

  interface Props { data?: StatCardData | null; }
  let { data = {} }: Props = $props();

  const COLORS: Record<string, string> = {
    default: 'var(--color-accent)',
    success: 'var(--color-teal)',
    warning: 'var(--color-amber)',
    error: 'var(--color-accent2)',
    info: '#3b82f6',
  };

  const accent = $derived(COLORS[data?.variant ?? 'default'] ?? 'var(--color-accent)');

  const trendInfo = $derived(() => {
    const t = data?.trend;
    if (!t) return null;
    if (typeof t === 'string') {
      const arr = t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
      const col = t === 'up' ? 'var(--color-teal)' : t === 'flat' ? 'var(--color-text2)' : 'var(--color-accent2)';
      return { arrow: arr, val: data?.delta ?? '', color: col };
    }
    const positive = t.positive ?? t.direction === 'up';
    return {
      arrow: t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '→',
      val: t.value ?? '',
      color: positive ? 'var(--color-teal)' : t.direction === 'flat' ? 'var(--color-text2)' : 'var(--color-accent2)',
    };
  });
</script>

<div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans min-w-[140px] md:min-w-[160px]" style="border-top: 3px solid {accent};">
  <div class="text-center py-2">
    <div class="text-xs font-mono text-text2 uppercase tracking-widest mb-2">{data?.label ?? ''}</div>
    <div class="text-3xl md:text-4xl font-bold leading-none" style="color:{accent};">
      {data?.value ?? '—'}{#if data?.unit}<span class="text-base text-text2 ml-1">{data.unit}</span>{/if}
    </div>
    {#if trendInfo()}
      {@const t = trendInfo()!}
      <div class="flex items-center gap-1 justify-center mt-1">
        <span class="text-base font-bold" style="color:{t.color};">{t.arrow}</span>
        {#if t.val}<span class="text-sm font-semibold" style="color:{t.color};">{t.val}</span>{/if}
      </div>
    {/if}
    {#if data?.previousValue !== undefined}<div class="text-xs text-text2 mt-1">prev: {data.previousValue}</div>{/if}
  </div>
</div>
