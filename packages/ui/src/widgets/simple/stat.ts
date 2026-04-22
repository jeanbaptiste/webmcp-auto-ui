export interface StatBlockData {
  label: string;
  value: string;
  trend?: string;
  trendDir?: 'up' | 'down' | 'neutral';
}

/**
 * Vanilla renderer for the "stat" / StatBlock widget.
 *
 * Mounts a metric block (label + value + optional trend) into `container`.
 * Returns a cleanup function that clears the container.
 *
 * Contract:
 *  - Pure imperative DOM (no Svelte runes, no framework).
 *  - Emits no events by default (the Svelte original had none either) but keeps
 *    the standard `widget:interact` channel available via helper if ever needed.
 *  - Tailwind classes and CSS vars are preserved verbatim.
 */
export function render(container: HTMLElement, data: any): () => void {
  const d: Partial<StatBlockData> = (data && typeof data === 'object') ? data : {};

  const trendDir = d.trendDir;
  const trendColor =
    trendDir === 'up' ? 'text-teal'
    : trendDir === 'down' ? 'text-accent2'
    : 'text-text2';
  const trendArrow =
    trendDir === 'up' ? '↑'
    : trendDir === 'down' ? '↓'
    : '→';

  const root = document.createElement('div');
  root.className = 'p-4 md:p-5';

  const labelEl = document.createElement('div');
  labelEl.className = 'text-[11px] font-mono text-text2 mb-1 uppercase tracking-widest';
  labelEl.textContent = d.label ?? 'Metric';
  root.appendChild(labelEl);

  const valueEl = document.createElement('div');
  valueEl.className = 'text-3xl md:text-4xl font-bold text-text1 leading-none';
  valueEl.textContent = d.value ?? '—';
  root.appendChild(valueEl);

  if (d.trend) {
    const trendEl = document.createElement('div');
    trendEl.className = `text-xs font-mono mt-2 ${trendColor}`;
    trendEl.textContent = `${trendArrow} ${d.trend}`;
    root.appendChild(trendEl);
  }

  container.appendChild(root);

  return () => {
    container.innerHTML = '';
  };
}
