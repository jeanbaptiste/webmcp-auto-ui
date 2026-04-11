/** timeline — Chronological events with status */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const events = (data.events as Array<{ date?: string; title: string; description?: string; status?: string }>) ?? [];

  const statusColors: Record<string, string> = {
    done: '#00b894',
    active: '#6c5ce7',
    pending: '#555',
  };

  let html = '<div style="padding:12px 16px;font-family:system-ui,sans-serif;">';
  if (title) html += `<div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">${esc(title)}</div>`;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const color = statusColors[ev.status ?? ''] ?? '#555';
    const isLast = i === events.length - 1;
    html += `<div style="display:flex;gap:12px;position:relative;">
      <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:16px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid ${color};flex-shrink:0;margin-top:2px;"></div>
        ${!isLast ? '<div style="width:2px;flex:1;background:#333;margin:2px 0;"></div>' : ''}
      </div>
      <div style="padding-bottom:${isLast ? '0' : '16px'};flex:1;">
        ${ev.date ? `<div style="font-size:10px;color:#888;font-family:ui-monospace,monospace;margin-bottom:2px;">${esc(ev.date)}</div>` : ''}
        <div style="font-size:13px;font-weight:600;color:#e0e0e0;">${esc(ev.title)}</div>
        ${ev.description ? `<div style="font-size:12px;color:#aaa;margin-top:2px;">${esc(ev.description)}</div>` : ''}
      </div>
    </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
