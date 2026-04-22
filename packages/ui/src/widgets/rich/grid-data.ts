/**
 * GridData — vanilla renderer.
 * Port of GridData.svelte. Preserves Tailwind classes, CSS vars, highlights, a11y.
 *
 * Contract:
 *   render(container, spec): cleanup
 * Events:
 *   On cell double-click -> CustomEvent('widget:interact', {
 *     detail: { action: 'cellclick', payload: { row, col, value } },
 *     bubbles: true
 *   })
 */

export interface GridDataColumn {
  key: string;
  label: string;
  width?: string;
}

export interface GridDataHighlight {
  row: number;
  col: number;
  color?: string;
}

export interface GridDataSpec {
  title?: string;
  columns?: GridDataColumn[];
  rows?: unknown[][];
  highlights?: GridDataHighlight[];
  cellHeight?: number;
}

function displayValue(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function buildHighlightMap(highlights: GridDataHighlight[] | undefined): Map<string, string> {
  const m = new Map<string, string>();
  if (Array.isArray(highlights)) {
    for (const h of highlights) {
      if (!h || typeof h.row !== 'number' || typeof h.col !== 'number') continue;
      const color =
        h.color ?? 'color-mix(in srgb, var(--color-accent) 20%, transparent)';
      m.set(`${h.row},${h.col}`, color);
    }
  }
  return m;
}

export function render(container: HTMLElement, data: any): () => void {
  const spec: Partial<GridDataSpec> = (data ?? {}) as Partial<GridDataSpec>;
  const columns: GridDataColumn[] = Array.isArray(spec.columns) ? spec.columns : [];
  const rows: unknown[][] = Array.isArray(spec.rows) ? (spec.rows as unknown[][]) : [];
  const cellH: number = typeof spec.cellHeight === 'number' ? spec.cellHeight : 32;
  const hlMap = buildHighlightMap(spec.highlights);

  // Clear container
  container.innerHTML = '';

  // Root
  const root = document.createElement('div');
  root.className = 'bg-surface border border-border rounded-lg p-3 md:p-4 font-sans';

  // Title
  if (spec.title) {
    const h3 = document.createElement('h3');
    h3.className = 'text-sm font-semibold text-text1 mb-3';
    h3.textContent = String(spec.title);
    root.appendChild(h3);
  }

  // Empty state
  if (!columns.length && !rows.length) {
    const empty = document.createElement('p');
    empty.className = 'text-text2 text-sm';
    empty.textContent = 'No data';
    root.appendChild(empty);
    container.appendChild(root);
    return () => {
      container.innerHTML = '';
    };
  }

  // Scroll wrapper
  const scroll = document.createElement('div');
  scroll.className = 'overflow-auto rounded border border-border';

  // Table
  const table = document.createElement('table');
  table.className = 'w-full border-collapse text-xs font-mono';
  table.setAttribute('role', 'grid');

  // Head
  if (columns.length) {
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    for (const col of columns) {
      const th = document.createElement('th');
      th.className =
        'sticky top-0 bg-surface2 px-3 py-2 text-left text-text2 border-b border-r border-border whitespace-nowrap font-medium';
      if (col && col.width) th.style.width = String(col.width);
      th.setAttribute('scope', 'col');
      th.textContent = col && col.label != null ? String(col.label) : '';
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    table.appendChild(thead);
  }

  // Body — store listeners for cleanup
  const listeners: Array<{ el: HTMLElement; handler: EventListener }> = [];
  const tbody = document.createElement('tbody');

  rows.forEach((row, ri) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-surface2';
    const cells = Array.isArray(row) ? row : [];
    cells.forEach((cell, ci) => {
      const td = document.createElement('td');
      td.className =
        'px-3 text-text2 border-b border-r border-border cursor-pointer hover:bg-surface2';
      const bgColor = hlMap.get(`${ri},${ci}`);
      td.style.height = `${cellH}px`;
      if (bgColor) td.style.background = bgColor;
      td.setAttribute('role', 'gridcell');
      td.title = 'Double-cliquez pour interagir';
      td.textContent = displayValue(cell);

      const handler = (() => {
        return () => {
          container.dispatchEvent(
            new CustomEvent('widget:interact', {
              detail: {
                action: 'cellclick',
                payload: { row: ri, col: ci, value: cell }
              },
              bubbles: true
            })
          );
        };
      })();
      td.addEventListener('dblclick', handler);
      listeners.push({ el: td, handler: handler as EventListener });

      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  scroll.appendChild(table);
  root.appendChild(scroll);
  container.appendChild(root);

  return () => {
    for (const { el, handler } of listeners) {
      el.removeEventListener('dblclick', handler);
    }
    listeners.length = 0;
    container.innerHTML = '';
  };
}

export default { render };
