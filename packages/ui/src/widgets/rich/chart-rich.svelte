<svelte:options customElement={{ tag: 'auto-chart-rich', shadow: 'none' }} />

<script lang="ts">
  export interface ChartDataset { label?: string; values: number[]; color?: string; }
  export interface ChartData {
    title?: string;
    type?: 'bar' | 'line' | 'area' | 'pie' | 'donut';
    labels?: string[];
    datasets?: ChartDataset[];
    legend?: boolean;
    xAxis?: { label?: string };
    yAxis?: { label?: string };
  }

  interface Props { data?: ChartData | null; }
  let { data = {} }: Props = $props();

  const PAL = [
    '#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6',
    '#06b6d4','#f97316','#ec4899','#14b8a6','#a855f7',
    '#eab308','#3b82f6','#22c55e','#e11d48','#0ea5e9',
  ];

  const fmt = new Intl.NumberFormat('fr-FR');

  /**
   * Defensive coercion — port of normalizeBars from be5ab97.
   * Accepts raw values arrays or object shapes, never throws.
   */
  function coerceValues(raw: unknown): number[] {
    if (!Array.isArray(raw)) return [];
    const toNum = (v: unknown): number => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0; }
      return 0;
    };
    return raw.map(toNum);
  }

  function isPrimitiveLabel(v: unknown): v is string | number | boolean {
    return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
  }

  function normalizeDatasets(raw: unknown): ChartDataset[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap(item => {
      if (!item || typeof item !== 'object') return [];
      const o = item as Record<string, unknown>;
      // Validate values field
      const values = coerceValues(o.values);
      if (!values.length) return [];
      return [{ label: isPrimitiveLabel(o.label) ? String(o.label) : undefined, values, color: typeof o.color === 'string' ? o.color : undefined }];
    });
  }

  const datasets = $derived<ChartDataset[]>(normalizeDatasets(data?.datasets));
  const labels = $derived<string[]>(Array.isArray(data?.labels) ? (data!.labels! as unknown[]).filter(isPrimitiveLabel).map(String) : []);
  const type = $derived(data?.type ?? 'bar');
  const isPie = $derived(type === 'pie' || type === 'donut');
  const allVals = $derived(datasets.flatMap(d => d.values));
  const maxVal = $derived(Math.max(...allVals.filter(v => typeof v === 'number'), 1));
  const xLabels = $derived(labels.length > 0 ? labels : (datasets[0]?.values ?? []).map((_, i) => String(i + 1)));
  const showLegend = $derived(data?.legend !== false && datasets.length > 1);

  function col(ds: ChartDataset, i: number) { return ds.color ?? PAL[i % PAL.length]; }

  const isCategoricalBar = $derived(type === 'bar' && datasets.length === 1);
  const isCategoricalLine = $derived((type === 'line' || type === 'area') && datasets.length === 1);
  function barCol(ds: ChartDataset, di: number, xi: number) { return isCategoricalBar ? PAL[xi % PAL.length] : col(ds, di); }

  // Pie
  const pieTotal = $derived.by<number>(() => {
    const ds = datasets[0];
    if (!ds) return 1;
    return ds.values.reduce((a, b) => a + b, 0) || 1;
  });

  interface Slice { label: string; value: number; color: string; startAngle: number; endAngle: number; pct: number; }
  const slices = $derived.by<Slice[]>(() => {
    if (!isPie || !datasets.length) return [];
    const ds = datasets[0];
    const tot = pieTotal;
    let angle = -Math.PI / 2;
    return (ds.values).map((v, i) => {
      const pct = v / tot;
      const start = angle;
      angle += pct * 2 * Math.PI;
      return { label: xLabels[i] ?? String(i), value: v, color: col(ds, i), startAngle: start, endAngle: angle, pct };
    });
  });

  function arc(cx: number, cy: number, r: number, start: number, end: number, ir = 0): string {
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    if (ir > 0) {
      const ix1 = cx + ir * Math.cos(end), iy1 = cy + ir * Math.sin(end);
      const ix2 = cx + ir * Math.cos(start), iy2 = cy + ir * Math.sin(start);
      return `M${x1},${y1}A${r},${r},0,${large},1,${x2},${y2}L${ix1},${iy1}A${ir},${ir},0,${large},0,${ix2},${iy2}Z`;
    }
    return `M${cx},${cy}L${x1},${y1}A${r},${r},0,${large},1,${x2},${y2}Z`;
  }

  let tooltip = $state<string | null>(null);
</script>

<div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
  {#if data?.title}<h3 class="text-sm font-semibold text-text1 mb-3">{data.title}</h3>{/if}
  {#if !datasets.length}
    <p class="text-text2 text-sm">No data</p>
  {:else if isPie}
    <div class="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
      <svg viewBox="-1 -1 2 2" class="w-40 h-40 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={data?.title ?? 'Pie chart'}>
        {#each slices as s}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <path
            d={arc(0, 0, 0.9, s.startAngle, s.endAngle, type === 'donut' ? 0.5 : 0)}
            fill={s.color}
            opacity="0.85"
            onmouseenter={() => tooltip = `${s.label}: ${fmt.format(s.value)} (${Math.round(s.pct * 100)}%)`}
            onmouseleave={() => tooltip = null}
            class="cursor-pointer hover:opacity-100 transition-opacity"
          >
            <title>{s.label}: {fmt.format(s.value)} ({Math.round(s.pct * 100)}%)</title>
          </path>
        {/each}
      </svg>
      <div class="flex flex-col gap-1.5 text-xs">
        {#each slices as s}
          <div class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:{s.color};"></div>
            <span class="text-text2">{s.label}</span>
            <span class="text-text2 ml-1">{Math.round(s.pct * 100)}%</span>
          </div>
        {/each}
      </div>
    </div>
    {#if tooltip}<div class="mt-2 text-xs text-text2 font-mono">{tooltip}</div>{/if}
  {:else}
    <div class="relative">
      {#if type === 'bar'}
        <div class="flex items-end gap-1 h-24 sm:h-32 mb-1" role="img" aria-label={data?.title ?? 'Bar chart'}>
          {#each xLabels as lbl, xi}
            <div class="flex-1 flex gap-0.5 items-end h-full">
              {#each datasets as ds, di}
                {@const v = ds.values[xi] ?? 0}
                {@const pct = Math.round(v / maxVal * 100)}
                <div
                  class="flex-1 rounded-t transition-all hover:opacity-80 cursor-default"
                  style="height:{pct}%;background:{barCol(ds, di, xi)};"
                  title="{ds.label ?? ''} {lbl}: {fmt.format(v)}"
                ></div>
              {/each}
            </div>
          {/each}
        </div>
        <div class="flex gap-1 mb-2">
          {#each xLabels as lbl}
            <div class="flex-1 text-center text-[9px] font-mono text-text2 truncate">{lbl}</div>
          {/each}
        </div>
      {:else}
        {@const W = 400}{@const H = 120}{@const pad = 10}
        <svg viewBox="0 0 {W} {H}" class="w-full" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={data?.title ?? 'Line chart'}>
          {#each datasets as ds, di}
            {@const pts = ds.values.map((v, i) => `${pad + i * ((W - pad * 2) / (ds.values.length - 1 || 1))},${H - pad - (v / maxVal) * (H - pad * 2)}`)}
            {#if type === 'area'}
              <polygon
                points="{pad},{H - pad} {pts.join(' ')} {pad + ((ds.values.length - 1) * ((W - pad * 2) / (ds.values.length - 1 || 1)))},{H - pad}"
                fill={col(ds, di)}
                opacity="0.15"
              />
            {/if}
            <polyline points={pts.join(' ')} fill="none" stroke={col(ds, di)} stroke-width="2" stroke-linejoin="round" />
            {#each ds.values as v, i}
              {@const cx = pad + i * ((W - pad * 2) / (ds.values.length - 1 || 1))}
              {@const cy = H - pad - (v / maxVal) * (H - pad * 2)}
              <circle cx={cx} cy={cy} r="4" fill={isCategoricalLine ? PAL[i % PAL.length] : col(ds, di)} stroke="var(--color-surface, white)" stroke-width="1.5">
                <title>{ds.label ?? xLabels[i] ?? String(i)}: {fmt.format(v)}</title>
              </circle>
            {/each}
          {/each}
        </svg>
        <div class="flex gap-1">
          {#each xLabels as lbl}
            <div class="flex-1 text-center text-[9px] font-mono text-text2 truncate">{lbl}</div>
          {/each}
        </div>
      {/if}
    </div>
    {#if isCategoricalLine && xLabels.length > 1}
      <div class="flex gap-3 flex-wrap mt-2">
        {#each xLabels as lbl, xi}
          <div class="flex items-center gap-1 text-xs">
            <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:{PAL[xi % PAL.length]};"></div>
            <span class="text-text2">{lbl}</span>
          </div>
        {/each}
      </div>
    {:else if isCategoricalBar && xLabels.length > 1}
      <div class="flex gap-3 flex-wrap mt-2">
        {#each xLabels as lbl, xi}
          <div class="flex items-center gap-1 text-xs">
            <div class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:{PAL[xi % PAL.length]};"></div>
            <span class="text-text2">{lbl}</span>
          </div>
        {/each}
      </div>
    {:else if showLegend}
      <div class="flex gap-3 flex-wrap mt-2">
        {#each datasets as ds, i}
          <div class="flex items-center gap-1 text-xs">
            <div class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:{col(ds, i)};"></div>
            <span class="text-text2">{ds.label ?? `Series ${i + 1}`}</span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
