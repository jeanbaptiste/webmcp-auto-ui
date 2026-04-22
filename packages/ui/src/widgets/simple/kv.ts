/**
 * KV vanilla renderer.
 * Ported from KVBlock.svelte — preserves Tailwind classes, a11y, and data shape.
 *
 * Data contract:
 *   { title?: string; rows?: [string, string][] }
 *
 * Interactions: this widget is purely presentational — no events emitted.
 */

export interface KVData {
  title?: string;
  rows?: [string, string][];
}

export function render(container: HTMLElement, data: any): () => void {
  const d: KVData = (data && typeof data === 'object' ? data : {}) as KVData;

  const wrap = document.createElement('div');
  wrap.className = 'p-3 md:p-4';

  if (d.title) {
    const titleEl = document.createElement('div');
    titleEl.className = 'text-[10px] font-mono text-text2 mb-3 uppercase tracking-widest';
    titleEl.textContent = String(d.title);
    wrap.appendChild(titleEl);
  }

  const list = document.createElement('div');
  list.className = 'flex flex-col gap-1.5';

  const rows: [string, string][] = Array.isArray(d.rows) ? d.rows : [];

  if (rows.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'text-xs text-text2 italic';
    empty.textContent = '—';
    list.appendChild(empty);
  } else {
    for (const entry of rows) {
      const row = document.createElement('div');
      row.className =
        'flex justify-between items-center text-sm border-b border-border pb-1.5 last:border-none last:pb-0';

      const k = Array.isArray(entry) ? entry[0] : '';
      const v = Array.isArray(entry) ? entry[1] : '';

      const keyEl = document.createElement('span');
      keyEl.className = 'font-mono text-xs text-text2';
      keyEl.textContent = k == null ? '' : String(k);

      const valEl = document.createElement('span');
      valEl.className = 'text-text1 font-medium';
      valEl.textContent = v == null ? '' : String(v);

      row.appendChild(keyEl);
      row.appendChild(valEl);
      list.appendChild(row);
    }
  }

  wrap.appendChild(list);
  container.appendChild(wrap);

  return () => {
    container.innerHTML = '';
  };
}
