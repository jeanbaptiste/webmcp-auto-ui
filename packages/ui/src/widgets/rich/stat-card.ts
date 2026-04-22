export interface StatCardTrend {
  direction: 'up' | 'down' | 'flat';
  value?: string;
  positive?: boolean;
}

export interface StatCardSpec {
  label?: string;
  value?: unknown;
  unit?: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat' | StatCardTrend;
  previousValue?: unknown;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const COLORS: Record<string, string> = {
  default: 'var(--color-accent)',
  success: 'var(--color-teal)',
  warning: 'var(--color-amber)',
  error: 'var(--color-accent2)',
  info: '#3b82f6',
};

function computeAccent(spec: Partial<StatCardSpec>): string {
  return COLORS[spec.variant ?? 'default'] ?? 'var(--color-accent)';
}

interface TrendInfo {
  arrow: string;
  val: string;
  color: string;
}

function computeTrendInfo(spec: Partial<StatCardSpec>): TrendInfo | null {
  const t = spec.trend;
  if (!t) return null;
  if (typeof t === 'string') {
    const arrow = t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
    const color =
      t === 'up'
        ? 'var(--color-teal)'
        : t === 'flat'
          ? 'var(--color-text2)'
          : 'var(--color-accent2)';
    return { arrow, val: spec.delta ?? '', color };
  }
  const positive = t.positive ?? t.direction === 'up';
  const arrow = t.direction === 'up' ? '↑' : t.direction === 'down' ? '↓' : '→';
  const color = positive
    ? 'var(--color-teal)'
    : t.direction === 'flat'
      ? 'var(--color-text2)'
      : 'var(--color-accent2)';
  return { arrow, val: t.value ?? '', color };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toDisplay(v: unknown): string {
  if (v === null || v === undefined) return '';
  return escapeHtml(String(v));
}

export function render(container: HTMLElement, data: any): () => void {
  const spec: Partial<StatCardSpec> = data && typeof data === 'object' ? data : {};
  const accent = computeAccent(spec);
  const trend = computeTrendInfo(spec);

  const label = toDisplay(spec.label ?? '');
  const valueStr =
    spec.value === null || spec.value === undefined ? '—' : toDisplay(spec.value);
  const unit = spec.unit ? toDisplay(spec.unit) : '';
  const prev =
    spec.previousValue !== undefined ? toDisplay(spec.previousValue) : null;

  const unitHtml = unit ? `<span class="text-base text-text2 ml-1">${unit}</span>` : '';

  const trendHtml = trend
    ? `<div class="flex items-center gap-1 justify-center mt-1">
        <span class="text-base font-bold" style="color:${trend.color};" aria-hidden="true">${trend.arrow}</span>
        ${trend.val ? `<span class="text-sm font-semibold" style="color:${trend.color};">${escapeHtml(trend.val)}</span>` : ''}
      </div>`
    : '';

  const prevHtml =
    prev !== null ? `<div class="text-xs text-text2 mt-1">prev: ${prev}</div>` : '';

  container.innerHTML = `
    <div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans min-w-[140px] md:min-w-[160px]" style="border-top: 3px solid ${accent};" role="group" aria-label="${label || 'stat'}">
      <div class="text-center py-2">
        <div class="text-xs font-mono text-text2 uppercase tracking-widest mb-2">${label}</div>
        <div class="text-3xl md:text-4xl font-bold leading-none" style="color:${accent};">
          ${valueStr}${unitHtml}
        </div>
        ${trendHtml}
        ${prevHtml}
      </div>
    </div>
  `;

  const root = container.firstElementChild as HTMLElement | null;
  const onClick = (e: Event) => {
    container.dispatchEvent(
      new CustomEvent('widget:interact', {
        detail: { action: 'select', payload: { label: spec.label, value: spec.value } },
        bubbles: true,
      })
    );
    e.stopPropagation();
  };
  if (root) root.addEventListener('click', onClick);

  return () => {
    if (root) root.removeEventListener('click', onClick);
    container.innerHTML = '';
  };
}
