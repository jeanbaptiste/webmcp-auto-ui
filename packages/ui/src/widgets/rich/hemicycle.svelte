<svelte:options customElement={{ tag: 'auto-hemicycle', shadow: 'none' }} />

<script lang="ts">
  export interface HemicycleGroup { id: string; label: string; seats: number; color: string; }
  export interface HemicycleData {
    title?: string;
    groups?: HemicycleGroup[];
    totalSeats?: number;
    rows?: number;
  }

  interface Props {
    data?: HemicycleData | null;
    ongroupclick?: (g: HemicycleGroup) => void;
  }
  let { data = {}, ongroupclick }: Props = $props();

  const groups = $derived<HemicycleGroup[]>(Array.isArray(data?.groups) ? data!.groups! : []);
  const total = $derived(data?.totalSeats ?? groups.reduce((s, g) => s + g.seats, 0));

  const W = 420, H = 230, cx = W / 2, cy = H - 10, rMin = 60, step = 28;
  const rows = $derived(data?.rows ?? Math.min(Math.max(3, Math.ceil(Math.sqrt(total / 6))), 7));

  interface Seat { x: number; y: number; color: string; gid: string }

  const seats = $derived.by<Seat[]>(() => {
    if (!groups.length || !total) return [];
    const radii = Array.from({ length: rows }, (_, i) => rMin + i * step);
    const circs = radii.map(r => Math.PI * r);
    const totalC = circs.reduce((a, b) => a + b, 0);
    const spr = radii.map(r => Math.round(Math.PI * r / totalC * total));
    spr[spr.length - 1] += total - spr.reduce((a, b) => a + b, 0);
    const sorted = [...groups].sort((a, b) => a.seats - b.seats);
    const colors: { color: string; gid: string }[] = [];
    for (const g of sorted) for (let i = 0; i < g.seats; i++) colors.push({ color: g.color, gid: g.id });
    while (colors.length < total) colors.push({ color: '#333355', gid: '' });
    const result: Seat[] = [];
    let idx = 0;
    for (let row = 0; row < rows; row++) {
      const r = radii[row], n = spr[row];
      for (let j = 0; j < n; j++) {
        if (idx >= colors.length) break;
        const angle = Math.PI - (j / (n - 1 || 1)) * Math.PI;
        result.push({ x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle), ...colors[idx++] });
      }
    }
    return result;
  });

  const rMax = $derived(rMin + rows * step);
  const legend = $derived([...groups].sort((a, b) => b.seats - a.seats));
  let tooltip = $state<{ label: string; seats: number } | null>(null);
</script>

<div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
  {#if data?.title}<h3 class="text-sm font-semibold text-text1 mb-3">{data.title}</h3>{/if}
  {#if !groups.length || !total}<p class="text-text2 text-sm">No data</p>
  {:else}
    <div class="relative">
      <svg viewBox="0 0 {W} {H}" class="block w-full max-h-[220px]" xmlns="http://www.w3.org/2000/svg">
        <path d="M {cx - rMax - 15} {cy} A {rMax + 15} {rMax + 15} 0 0 1 {cx + rMax + 15} {cy}" fill="none" stroke="var(--color-surface2)" stroke-width="2"/>
        {#each seats as s}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- svelte-ignore a11y_interactive_supports_focus -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <circle cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r="4" fill={s.color} opacity="0.9"
            class={s.gid ? 'cursor-pointer' : ''}
            onmouseenter={() => { const g = groups.find(g => g.id === s.gid); if (g) tooltip = { label: g.label, seats: g.seats }; }}
            onmouseleave={() => tooltip = null}
            ondblclick={() => { const g = groups.find(g => g.id === s.gid); if (g) ongroupclick?.(g); }}>
            {#if s.gid}<title>Double-click to interact</title>{/if}
          </circle>
        {/each}
        <text x={cx} y={cy + 18} text-anchor="middle" font-size="11" fill="var(--color-text2)" font-family="system-ui">{total} seats</text>
      </svg>
      {#if tooltip}
        <div class="absolute top-0 right-0 bg-surface2 border border-border2 rounded px-2 py-1 text-xs text-text1 pointer-events-none">
          <span class="font-semibold">{tooltip.label}</span> — {tooltip.seats}
        </div>
      {/if}
    </div>
    <div class="flex flex-wrap gap-x-4 gap-y-1 mt-3">
      {#each legend as g}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80" role="button" tabindex="0" title="Double-click to interact" ondblclick={() => ongroupclick?.(g)} onkeydown={(e) => { if (e.key === 'Enter') ongroupclick?.(g); }}>
          <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:{g.color};"></div>
          <span class="text-text2">{g.label}</span>
          <span class="text-text2">{g.seats}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
