<svelte:options customElement={{ tag: 'auto-stat-card', shadow: 'none' }} />

<script lang="ts">
  export interface StatCardTrend { direction: 'up' | 'down' | 'flat'; value?: string; positive?: boolean; }
  export interface StatCardItem {
    label?: string;
    value?: unknown;
    unit?: string;
    icon?: string;
    delta?: string;
    trend?: 'up' | 'down' | 'flat' | StatCardTrend;
    previousValue?: unknown;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  }
  export interface StatCardData extends StatCardItem {
    /** Grid mode: render N cards */
    items?: StatCardItem[];
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

  // Icon resolution: map common string identifiers → emoji/unicode.
  // Unknown icons fall back silently to ℹ (info).
  const ICON_MAP: Record<string, string> = {
    info:           'ℹ',
    check:          '✓',
    checkmark:      '✓',
    warning:        '⚠',
    warn:           '⚠',
    error:          '✕',
    close:          '✕',
    up:             '↑',
    'trending-up':  '↑',
    trending_up:    '↑',
    down:           '↓',
    'trending-down':'↓',
    trending_down:  '↓',
    flat:           '→',
    star:           '★',
    heart:          '♥',
    fire:           '🔥',
    lightning:      '⚡',
    clock:          '⏱',
    calendar:       '📅',
    user:           '👤',
    users:          '👥',
    money:          '💰',
    dollar:         '$',
    euro:           '€',
    percent:        '%',
    chart:          '📊',
    globe:          '🌐',
    lock:           '🔒',
    key:            '🔑',
    mail:           '✉',
    phone:          '📞',
    pin:            '📍',
    tag:            '🏷',
    flag:           '🚩',
    box:            '📦',
    cpu:            '💻',
    database:       '🗄',
    cloud:          '☁',
    signal:         '📶',
    speed:          '⚡',
  };

  function resolveIcon(icon: string | undefined): string | null {
    if (!icon) return null;
    // If it looks like an emoji or unicode symbol (not a plain ascii identifier), use as-is.
    if (/\p{Emoji}/u.test(icon) && !/^[a-z0-9_-]+$/i.test(icon)) return icon;
    // Try direct lookup, then lowercased.
    return ICON_MAP[icon] ?? ICON_MAP[icon.toLowerCase()] ?? 'ℹ';
  }

  function accentFor(variant: string | undefined): string {
    return COLORS[variant ?? 'default'] ?? 'var(--color-accent)';
  }

  function trendInfoFor(item: StatCardItem): { arrow: string; val: string; color: string } | null {
    const t = item.trend;
    if (!t) return null;
    if (typeof t === 'string') {
      const arr = t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
      const col = t === 'up' ? 'var(--color-teal)' : t === 'flat' ? 'var(--color-text2)' : 'var(--color-accent2)';
      return { arrow: arr, val: item.delta ?? '', color: col };
    }
    const positive = t.positive ?? t.direction === 'up';
    return {
      arrow: t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '→',
      val: t.value ?? '',
      color: positive ? 'var(--color-teal)' : t.direction === 'flat' ? 'var(--color-text2)' : 'var(--color-accent2)',
    };
  }

  // Determine render mode
  const isGrid = $derived(Array.isArray(data?.items) && (data!.items as StatCardItem[]).length > 0);
  const gridItems = $derived(isGrid ? (data!.items as StatCardItem[]) : []);

  // Single-card derived values
  const accent = $derived(accentFor(data?.variant));
  const trendInfo = $derived(() => trendInfoFor(data ?? {}));
  const iconGlyph = $derived(resolveIcon(data?.icon));
</script>

{#if isGrid}
  <!-- Grid mode: N stat-cards -->
  <div class="font-sans grid" style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem;">
    {#each gridItems as item}
      {@const a = accentFor(item.variant)}
      {@const ti = trendInfoFor(item)}
      {@const ig = resolveIcon(item.icon)}
      <div class="bg-surface border border-border rounded-lg p-3 min-w-[120px]" style="border-top: 3px solid {a};">
        <div class="text-center py-1">
          {#if ig}<div class="text-xl mb-1" style="color:{a};">{ig}</div>{/if}
          <div class="text-xs font-mono text-text2 uppercase tracking-widest mb-1">{item.label ?? ''}</div>
          <div class="text-2xl md:text-3xl font-bold leading-none" style="color:{a};">
            {item.value ?? '—'}{#if item.unit}<span class="text-sm text-text2 ml-1">{item.unit}</span>{/if}
          </div>
          {#if ti}
            <div class="flex items-center gap-1 justify-center mt-1">
              <span class="text-sm font-bold" style="color:{ti.color};">{ti.arrow}</span>
              {#if ti.val}<span class="text-xs font-semibold" style="color:{ti.color};">{ti.val}</span>{/if}
            </div>
          {/if}
          {#if item.previousValue !== undefined}<div class="text-xs text-text2 mt-1">prev: {item.previousValue}</div>{/if}
        </div>
      </div>
    {/each}
  </div>
{:else}
  <!-- Single card mode (classic) -->
  <div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans min-w-[140px] md:min-w-[160px]" style="border-top: 3px solid {accent};">
    <div class="text-center py-2">
      {#if iconGlyph}<div class="text-2xl mb-1" style="color:{accent};">{iconGlyph}</div>{/if}
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
{/if}
