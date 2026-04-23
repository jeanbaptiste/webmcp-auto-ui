/**
 * chart.ts — vanilla renderer for the simple bar chart widget.
 *
 * Mirrors ChartBlock.svelte 1:1: a minimal SVG-less inline bar chart built
 * from flexbox-sized <div> bars. We keep the flex/div approach (not SVG)
 * because it is strictly what the Svelte widget does — Tailwind classes,
 * hover transitions, truncation on labels — and we want visual parity.
 *
 * PNG export is still wired via the generic export-widget.ts fallback
 * (html-to-image captures the DOM). We do NOT expose __exportPng here
 * because the flex/div layout rasterises identically through html-to-image.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface ChartBlockData {
  title?: string;
  bars: [string, number][];
}

type ChartInput = Partial<ChartBlockData> | null | undefined;

// ── derived computations (mirrors $derived in Svelte) ───────────────────────

/**
 * Defensive coercion of various "bars" shapes the LLM may produce.
 *
 * Accepts:
 *   1. [[label, value], ...]                 canonical tuple form
 *   2. [{label, value}, ...]                 object with standard keys
 *   3. [{name, count}, ...] / [{name, value}]  LLM-natural fallback
 *
 * Everything else is skipped (never throws). In particular, if a tuple's
 * first element is itself an object (not a string/number/boolean), the
 * entry is dropped — this was the root cause of the "[object Object]"
 * labels + 2px bars bug in production.
 */
function normalizeBars(raw: unknown): [string, number][] {
  if (!Array.isArray(raw)) return [];
  const out: [string, number][] = [];

  const toNum = (v: unknown): number => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const isPrimitiveLabel = (v: unknown): v is string | number | boolean =>
    typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

  for (const entry of raw) {
    // Case 1: tuple array
    if (Array.isArray(entry)) {
      if (entry.length < 2) continue;
      const label = entry[0];
      // Root-cause guard: if label is not a primitive, skip (this was the bug).
      if (!isPrimitiveLabel(label)) continue;
      out.push([String(label), toNum(entry[1])]);
      continue;
    }

    // Case 2/3: object forms
    if (entry && typeof entry === 'object') {
      const o = entry as Record<string, unknown>;
      let label: unknown;
      let value: unknown;

      if ('label' in o) {
        label = o.label;
        value = 'value' in o ? o.value : o.count;
      } else if ('name' in o) {
        label = o.name;
        value = 'value' in o ? o.value : o.count;
      } else {
        continue;
      }

      if (!isPrimitiveLabel(label)) continue;
      out.push([String(label), toNum(value)]);
      continue;
    }

    // Anything else: skip silently.
  }

  return out;
}

function computeMax(bars: [string, number][]): number {
  let m = 1;
  for (const [, v] of bars) {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
    if (n > m) m = n;
  }
  return m;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function dispatchInteract(
  container: HTMLElement,
  action: string,
  payload: unknown
): void {
  container.dispatchEvent(
    new CustomEvent('widget:interact', {
      detail: { action, payload },
      bubbles: true,
    })
  );
}

// ── renderer ────────────────────────────────────────────────────────────────

/**
 * Render a bar chart into `container`. Returns a cleanup function that
 * removes listeners and empties the container.
 *
 * Contract:
 *   - data.title  : optional string header (mono, uppercase tracking).
 *   - data.bars   : array of [label, value] tuples. Missing/invalid → empty.
 *   - Partial data yields an empty placeholder (no bars, no labels).
 *
 * Events:
 *   - `widget:interact` CustomEvent with detail `{ action: 'bar:click',
 *     payload: { index, label, value } }` when a bar is clicked. Bars are
 *     keyboard-activatable (Enter/Space) and exposed as role=button.
 */
export function render(container: HTMLElement, data: ChartInput): () => void {
  // Reset in case of re-render into a dirty container.
  container.innerHTML = '';

  const bars = normalizeBars(data?.bars);
  const max = computeMax(bars);
  const title = typeof data?.title === 'string' ? data.title : '';

  const root = el('div', 'p-3 md:p-4');

  // Title
  if (title) {
    const titleEl = el(
      'div',
      'text-[10px] font-mono text-text2 mb-4 uppercase tracking-widest'
    );
    titleEl.textContent = title;
    root.appendChild(titleEl);
  }

  // Bars row
  const barsRow = el('div', 'flex items-end gap-1.5 h-32');
  const labelsRow = el('div', 'flex gap-1.5 mt-1');

  // Track bar-level listeners so we can unbind on cleanup.
  const unbinders: Array<() => void> = [];

  if (bars.length === 0) {
    // Placeholder: keep rows present so layout stays stable.
    const placeholder = el('div', 'flex-1 rounded-t bg-accent opacity-20');
    placeholder.style.height = '2px';
    barsRow.appendChild(placeholder);

    const placeholderLbl = el(
      'span',
      'flex-1 text-center text-[9px] font-mono text-text2 truncate'
    );
    placeholderLbl.textContent = '';
    labelsRow.appendChild(placeholderLbl);
  } else {
    bars.forEach(([label, val], index) => {
      const numVal = typeof val === 'number' && Number.isFinite(val) ? val : 0;
      const pct = Math.round((numVal / max) * 100);

      const bar = el(
        'div',
        'flex-1 rounded-t bg-accent opacity-80 hover:opacity-100 transition-all cursor-pointer'
      );
      bar.style.height = `max(2px, ${pct}%)`;
      bar.setAttribute('role', 'button');
      bar.setAttribute('tabindex', '0');
      bar.setAttribute(
        'aria-label',
        `${String(label ?? '')}: ${String(numVal)}`
      );
      bar.title = `${String(label ?? '')}: ${String(numVal)}`;

      const onClick = () => {
        dispatchInteract(container, 'bar:click', {
          index,
          label: String(label ?? ''),
          value: numVal,
        });
      };
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onClick();
        }
      };

      bar.addEventListener('click', onClick);
      bar.addEventListener('keydown', onKey);
      unbinders.push(() => {
        bar.removeEventListener('click', onClick);
        bar.removeEventListener('keydown', onKey);
      });

      barsRow.appendChild(bar);

      const lbl = el(
        'span',
        'flex-1 text-center text-[9px] font-mono text-text2 truncate'
      );
      lbl.textContent = String(label ?? '');
      labelsRow.appendChild(lbl);
    });
  }

  root.appendChild(barsRow);
  root.appendChild(labelsRow);
  container.appendChild(root);

  // a11y: describe the widget as a figure.
  container.setAttribute('role', 'figure');
  if (title) container.setAttribute('aria-label', title);

  // SVG_NS is imported but unused in this flex-based impl; keep it referenced
  // so future variants (e.g. axis ticks) can drop in without re-import.
  void SVG_NS;

  return () => {
    for (const off of unbinders) off();
    container.innerHTML = '';
    container.removeAttribute('role');
    container.removeAttribute('aria-label');
  };
}
