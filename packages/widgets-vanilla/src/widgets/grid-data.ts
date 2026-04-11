/** grid-data — Data grid with cell highlights */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const columns = data.columns as Array<{ key: string; label: string; width?: string }> | undefined;
  const rows = (data.rows as unknown[][]) ?? [];
  const highlights = (data.highlights as Array<{ row: number; col: number; color?: string }>) ?? [];

  // Build highlight map
  const hlMap = new Map<string, string>();
  for (const h of highlights) {
    hlMap.set(`${h.row},${h.col}`, h.color ?? '#fdcb6e');
  }

  let html = '<div style="padding:12px 16px;font-family:system-ui,sans-serif;">';
  if (title) html += `<div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">${esc(title)}</div>`;
  html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">';

  if (columns) {
    html += '<thead><tr>';
    for (const col of columns) {
      html += `<th style="padding:6px 8px;text-align:left;color:#888;font-family:ui-monospace,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #333;${col.width ? `width:${col.width};` : ''}">${esc(col.label)}</th>`;
    }
    html += '</tr></thead>';
  }

  html += '<tbody>';
  rows.forEach((row, ri) => {
    html += '<tr>';
    (row as unknown[]).forEach((cell, ci) => {
      const hlColor = hlMap.get(`${ri},${ci}`);
      const bgStyle = hlColor ? `background:${hlColor}22;border-left:2px solid ${hlColor};` : '';
      html += `<td style="padding:5px 8px;color:#e0e0e0;border-bottom:1px solid #222;${bgStyle}">${esc(String(cell ?? ''))}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div></div>';
  container.innerHTML = html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
