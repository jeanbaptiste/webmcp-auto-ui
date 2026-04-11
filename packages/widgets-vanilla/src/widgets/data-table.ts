/** data-table — Sortable data table */
export function render(container: HTMLElement, data: Record<string, unknown>): (() => void) | void {
  const title = data.title as string | undefined;
  const columns = data.columns as Array<{ key: string; label: string; align?: string }> | undefined;
  type ColDef = { key: string; label: string; align?: string };
  const rows = (data.rows as Record<string, unknown>[]) ?? [];

  // Derive columns from first row if not specified
  const cols: ColDef[] = columns ?? (rows.length > 0 ? Object.keys(rows[0]).map(k => ({ key: k, label: k })) : []);

  let sortCol = '';
  let sortAsc = true;
  let sortedRows = [...rows];

  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:12px 16px;font-family:system-ui,sans-serif;';

  function renderTable() {
    let html = '';
    if (title) html += `<div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">${esc(title)}</div>`;
    html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<thead><tr>';
    for (const col of cols) {
      const align = col.align ?? 'left';
      const indicator = sortCol === col.key ? (sortAsc ? ' \u25B2' : ' \u25BC') : '';
      html += `<th data-sort-key="${esc(col.key)}" style="padding:6px 8px;text-align:${align};color:#888;font-family:ui-monospace,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #333;cursor:pointer;user-select:none;white-space:nowrap;">${esc(col.label)}${indicator}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (const row of sortedRows) {
      html += '<tr>';
      for (const col of cols) {
        const align = col.align ?? 'left';
        const val = row[col.key];
        html += `<td style="padding:5px 8px;text-align:${align};color:#e0e0e0;border-bottom:1px solid #222;">${esc(String(val ?? ''))}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    wrap.innerHTML = html;
  }

  function handleClick(e: Event) {
    const th = (e.target as HTMLElement).closest('th[data-sort-key]') as HTMLElement | null;
    if (!th) return;
    const key = th.dataset.sortKey!;
    if (sortCol === key) {
      sortAsc = !sortAsc;
    } else {
      sortCol = key;
      sortAsc = true;
    }
    sortedRows = [...rows].sort((a, b) => {
      const av = a[key], bv = b[key];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
    renderTable();
  }

  wrap.addEventListener('click', handleClick);
  renderTable();
  container.innerHTML = '';
  container.appendChild(wrap);

  return () => { wrap.removeEventListener('click', handleClick); };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
