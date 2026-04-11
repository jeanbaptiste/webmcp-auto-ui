/** log — Event log with levels and timestamps */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const entries = (data.entries as Array<{ timestamp?: string; level?: string; message: string; source?: string }>) ?? [];

  const levelColors: Record<string, string> = {
    debug: '#888',
    info: '#0984e3',
    warn: '#fdcb6e',
    error: '#e17055',
  };

  let html = '<div style="padding:12px 16px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;">';
  if (title) html += `<div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;font-family:system-ui,sans-serif;">${esc(title)}</div>`;
  html += '<div style="background:#0d0d1a;border:1px solid #333;border-radius:6px;padding:8px;max-height:300px;overflow-y:auto;">';

  for (const entry of entries) {
    const color = levelColors[entry.level ?? ''] ?? '#888';
    const levelBadge = entry.level ? `<span style="color:${color};min-width:40px;display:inline-block;text-transform:uppercase;">${esc(entry.level)}</span>` : '';
    const ts = entry.timestamp ? `<span style="color:#555;min-width:60px;display:inline-block;">${esc(entry.timestamp)}</span>` : '';
    const src = entry.source ? `<span style="color:#6c5ce7;">[${esc(entry.source)}]</span> ` : '';

    html += `<div style="padding:2px 0;line-height:1.5;display:flex;gap:8px;border-bottom:1px solid #1a1a2e;">
      ${ts}${levelBadge}
      <span style="color:#e0e0e0;flex:1;">${src}${esc(entry.message)}</span>
    </div>`;
  }

  html += '</div></div>';
  container.innerHTML = html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
