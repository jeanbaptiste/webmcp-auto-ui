<script lang="ts">
  export interface StatCardTrend { direction: 'up'|'down'|'flat'; value?: string; positive?: boolean; }
  export interface StatCardSpec { label?: string; value?: unknown; unit?: string; delta?: string; trend?: 'up'|'down'|'flat'|StatCardTrend; previousValue?: unknown; variant?: 'default'|'success'|'warning'|'error'|'info'; }
  interface Props { spec: Partial<StatCardSpec>; }
  let { spec }: Props = $props();
  const COLORS: Record<string, string> = { default:'#7c6dfa', success:'#3ecfb2', warning:'#f0a050', error:'#fa6d7c', info:'#3b82f6' };
  const accent = $derived(COLORS[spec.variant ?? 'default'] ?? '#7c6dfa');
  const trendInfo = $derived(() => {
    const t = spec.trend;
    if (!t) return null;
    if (typeof t === 'string') {
      const arr = t==='up'?'↑':t==='down'?'↓':'→';
      const col = t==='up'?'#3ecfb2':t==='flat'?'#888':'#fa6d7c';
      return { arrow: arr, val: spec.delta??'', color: col };
    }
    const positive = t.positive ?? t.direction==='up';
    return { arrow: t.direction==='up'?'↑':t.direction==='down'?'↓':'→', val: t.value??'', color: positive?'#3ecfb2':t.direction==='flat'?'#888':'#fa6d7c' };
  });
</script>
<div class="bg-[#13131a] border border-white/[0.07] rounded-lg p-4 font-sans min-w-[160px]" style="border-top: 3px solid {accent};">
  <div class="text-center py-2">
    <div class="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">{spec.label ?? ''}</div>
    <div class="text-4xl font-bold leading-none" style="color:{accent};">
      {spec.value ?? '—'}{#if spec.unit}<span class="text-base text-zinc-500 ml-1">{spec.unit}</span>{/if}
    </div>
    {#if trendInfo()}
      {@const t = trendInfo()!}
      <div class="flex items-center gap-1 justify-center mt-1">
        <span class="text-base font-bold" style="color:{t.color};">{t.arrow}</span>
        {#if t.val}<span class="text-sm font-semibold" style="color:{t.color};">{t.val}</span>{/if}
      </div>
    {/if}
    {#if spec.previousValue !== undefined}<div class="text-xs text-zinc-600 mt-1">prev: {spec.previousValue}</div>{/if}
  </div>
</div>
