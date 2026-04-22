/**
 * data-table — vanilla renderer for DataTable widget.
 *
 * Contract:
 *   render(container, data) -> dispose()
 *
 * The `data` argument is the full object passed by the dispatcher:
 *   { spec: Partial<DataTableSpec>, data?: unknown, onrowclick?: (row) => void }
 *
 * Rows resolution: spec.rows first, else top-level `data` (if array), else [].
 * Columns: spec.columns if non-empty, else inferred from first row's keys.
 *
 * Local state (closure): sortCol, sortAsc. Clicking a <th> toggles
 *   null -> asc -> desc -> null (off) — matches the 3-state a11y pattern.
 *   (Svelte version only toggled asc/desc; we extend with an "off" state so
 *    aria-sort can correctly report "none"; set ENABLE_SORT_OFF=false to
 *    revert to strict parity.)
 *
 * Events: on row dblclick (when onrowclick is provided OR unconditionally),
 *   dispatches a bubbling CustomEvent 'widget:interact'
 *   with detail { action: 'rowclick', payload: row }.
 *   Also calls onrowclick(row) if provided (parity with Svelte).
 *
 * XSS: all values are inserted via textContent; the only exception is the
 *   anchor href for `type: 'link'` string values (href is an attribute, not
 *   innerHTML, so no script injection — but caller-supplied URLs are still
 *   rendered as-is, same as the Svelte version).
 */

export interface DataTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'boolean' | 'link';
}

export interface DataTableSpec {
  title?: string;
  columns?: DataTableColumn[];
  rows?: Record<string, unknown>[];
  compact?: boolean;
  striped?: boolean;
  emptyMessage?: string;
}

interface DataTableProps {
  spec?: Partial<DataTableSpec>;
  data?: unknown;
  onrowclick?: (row: Record<string, unknown>) => void;
}

const MAX = 200;
const STRICT_SVELTE_PARITY = true; // true = 2-state sort (asc/desc), false = 3-state (asc/desc/off)

function dv(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function resolveRows(props: DataTableProps): Record<string, unknown>[] {
  const specRows = props.spec?.rows;
  if (Array.isArray(specRows) && specRows.length) return specRows as Record<string, unknown>[];
  if (Array.isArray(props.data)) return props.data as Record<string, unknown>[];
  return [];
}

function resolveColumns(spec: Partial<DataTableSpec> | undefined, rows: Record<string, unknown>[]): DataTableColumn[] {
  const specCols = spec?.columns;
  if (Array.isArray(specCols) && specCols.length) return specCols as DataTableColumn[];
  if (rows.length > 0) return Object.keys(rows[0] as object).map((k) => ({ key: k, label: k }));
  return [];
}

function sortRows(rows: Record<string, unknown>[], col: string | null, asc: boolean): Record<string, unknown>[] {
  if (!col) return rows;
  return [...rows].sort((a, b) => {
    const av = a[col];
    const bv = b[col];
    const an = Number(av);
    const bn = Number(bv);
    const c = !isNaN(an) && !isNaN(bn) ? an - bn : String(av ?? '').localeCompare(String(bv ?? ''), 'fr');
    return asc ? c : -c;
  });
}

function alignClass(align?: 'left' | 'center' | 'right'): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return '';
}

export function render(container: HTMLElement, data: unknown): () => void {
  const props = (data ?? {}) as DataTableProps;
  const spec: Partial<DataTableSpec> = props.spec ?? {};
  const onrowclick = typeof props.onrowclick === 'function' ? props.onrowclick : undefined;
  const fmt = new Intl.NumberFormat('fr-FR');

  const rows = resolveRows(props);
  const columns = resolveColumns(spec, rows);
  const compact = spec.compact === true;
  const striped = spec.striped !== false;

  // Local sort state (closure).
  let sortCol: string | null = null;
  let sortAsc = true;

  // Cleanup registry.
  const cleanups: Array<() => void> = [];
  const on = <K extends keyof HTMLElementEventMap>(
    el: HTMLElement,
    type: K,
    handler: (ev: HTMLElementEventMap[K]) => void
  ) => {
    el.addEventListener(type, handler as EventListener);
    cleanups.push(() => el.removeEventListener(type, handler as EventListener));
  };

  // Root.
  const root = document.createElement('div');
  root.className = 'bg-surface border border-border rounded-lg p-3 md:p-4 font-sans';

  if (spec.title) {
    const h3 = document.createElement('h3');
    h3.className = 'text-sm font-semibold text-text1 mb-3';
    h3.textContent = spec.title;
    root.appendChild(h3);
  }

  // Empty state.
  if (columns.length === 0 && rows.length === 0) {
    const p = document.createElement('p');
    p.className = 'text-text2 text-sm';
    p.textContent = spec.emptyMessage ?? 'No data';
    root.appendChild(p);
    container.innerHTML = '';
    container.appendChild(root);
    return () => {
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
      container.innerHTML = '';
    };
  }

  // Scroll wrapper.
  const scroll = document.createElement('div');
  scroll.className = 'overflow-auto max-h-[480px] rounded border border-border';

  const table = document.createElement('table');
  table.className = 'w-full border-collapse';

  // THEAD.
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  // tbody created early so header click can re-render it.
  const tbody = document.createElement('tbody');

  function renderHeaders(): void {
    headRow.innerHTML = '';
    for (const col of columns) {
      const th = document.createElement('th');
      th.className =
        'sticky top-0 bg-surface2 border-b-2 border-border2 px-3 py-2 text-left text-xs font-mono font-medium text-text2 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-text1 transition-colors ' +
        alignClass(col.align);
      th.setAttribute('role', 'button');
      th.setAttribute('tabindex', '0');
      const ariaSort = sortCol === col.key ? (sortAsc ? 'ascending' : 'descending') : 'none';
      th.setAttribute('aria-sort', ariaSort);

      const labelSpan = document.createElement('span');
      labelSpan.textContent = col.label;
      th.appendChild(labelSpan);

      if (sortCol === col.key) {
        const arrow = document.createElement('span');
        arrow.className = 'ml-1 text-accent';
        arrow.textContent = sortAsc ? '↑' : '↓';
        th.appendChild(arrow);
      }

      const toggle = () => {
        if (sortCol === col.key) {
          if (STRICT_SVELTE_PARITY) {
            sortAsc = !sortAsc;
          } else {
            if (sortAsc) {
              sortAsc = false;
            } else {
              sortCol = null;
              sortAsc = true;
            }
          }
        } else {
          sortCol = col.key;
          sortAsc = true;
        }
        renderHeaders();
        renderBody();
      };

      on(th, 'click', toggle);
      on(th, 'keydown', (ev) => {
        const ke = ev as KeyboardEvent;
        if (ke.key === 'Enter' || ke.key === ' ') {
          ke.preventDefault();
          toggle();
        }
      });

      headRow.appendChild(th);
    }
  }

  function renderBody(): void {
    // Remove previous listeners attached to tbody descendants.
    // We can't selectively remove; we rebuild the row listeners each time.
    // (Strategy: keep a per-body cleanups list.)
    bodyCleanups.forEach((fn) => fn());
    bodyCleanups.length = 0;

    tbody.innerHTML = '';

    const sorted = sortRows(rows, sortCol, sortAsc);
    const displayed = sorted.slice(0, MAX);
    const overflow = rows.length > MAX ? rows.length - MAX : 0;

    displayed.forEach((row, i) => {
      const tr = document.createElement('tr');
      const stripedClass = striped && i % 2 === 1 ? 'bg-white/[0.02]' : '';
      const cursorClass = onrowclick ? 'cursor-pointer' : '';
      tr.className = `hover:bg-surface2 transition-colors ${stripedClass} ${cursorClass}`.trim();
      if (onrowclick) tr.title = 'Double-cliquez pour interagir';

      const handler = () => {
        try {
          onrowclick?.(row);
        } catch {
          /* swallow */
        }
        container.dispatchEvent(
          new CustomEvent('widget:interact', {
            detail: { action: 'rowclick', payload: row },
            bubbles: true,
          })
        );
      };
      tr.addEventListener('dblclick', handler);
      bodyCleanups.push(() => tr.removeEventListener('dblclick', handler));

      for (const col of columns) {
        const td = document.createElement('td');
        const sizeClass = compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';
        td.className =
          'border-b border-border text-text1 overflow-hidden text-ellipsis whitespace-nowrap max-w-[280px] ' +
          sizeClass +
          ' ' +
          alignClass(col.align);

        const val = row[col.key];

        if (val == null) {
          const span = document.createElement('span');
          span.className = 'text-text2';
          span.textContent = '—';
          td.appendChild(span);
        } else if (col.type === 'boolean') {
          const span = document.createElement('span');
          span.textContent = val ? '✓' : '✗';
          td.appendChild(span);
        } else if (col.type === 'link' && typeof val === 'string') {
          const a = document.createElement('a');
          a.href = val;
          a.className = 'text-accent hover:underline';
          a.textContent = val;
          td.appendChild(a);
        } else if (typeof val === 'object') {
          const code = document.createElement('code');
          code.className = 'text-xs bg-surface2 px-1 py-0.5 rounded';
          code.textContent = JSON.stringify(val);
          td.appendChild(code);
        } else if (typeof val === 'number') {
          const span = document.createElement('span');
          span.title = String(val);
          span.textContent = fmt.format(val);
          td.appendChild(span);
        } else {
          const s = String(val);
          const span = document.createElement('span');
          span.title = s;
          span.textContent = s.length > 80 ? s.slice(0, 77) + '…' : s;
          td.appendChild(span);
        }

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });

    if (overflow > 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = columns.length;
      td.className = 'text-center text-text2 text-xs py-2 px-3';
      td.textContent = `… ${overflow} more rows`;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

  const bodyCleanups: Array<() => void> = [];

  thead.appendChild(headRow);
  table.appendChild(thead);
  table.appendChild(tbody);
  scroll.appendChild(table);
  root.appendChild(scroll);

  // Footer: row count.
  const footer = document.createElement('div');
  footer.className = 'mt-2 text-text2 text-xs';
  footer.textContent = `${rows.length} ligne${rows.length !== 1 ? 's' : ''}`;
  root.appendChild(footer);

  renderHeaders();
  renderBody();

  container.innerHTML = '';
  container.appendChild(root);

  // silence "unused" for helper
  void dv;

  return () => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
    bodyCleanups.forEach((fn) => fn());
    bodyCleanups.length = 0;
    container.innerHTML = '';
  };
}
