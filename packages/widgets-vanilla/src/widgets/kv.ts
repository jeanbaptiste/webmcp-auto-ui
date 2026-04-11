/** kv — Key-value pairs */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const rows = (data.rows as [string, string][]) ?? [];

  let html = '<div style="padding:12px 16px;font-family:system-ui,sans-serif;">';
  if (title) html += `<div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">${esc(title)}</div>`;
  html += '<table style="width:100%;border-collapse:collapse;">';
  for (const [k, v] of rows) {
    html += `<tr>
      <td style="padding:4px 12px 4px 0;font-size:12px;color:#888;font-family:ui-monospace,monospace;white-space:nowrap;vertical-align:top;">${esc(k)}</td>
      <td style="padding:4px 0;font-size:13px;color:#e0e0e0;">${esc(String(v))}</td>
    </tr>`;
  }
  html += '</table></div>';
  container.innerHTML = html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
