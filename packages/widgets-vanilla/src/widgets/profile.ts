/** profile — Profile card with fields and stats */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const name = (data.name as string) ?? '';
  const subtitle = data.subtitle as string | undefined;
  const fields = (data.fields as Array<{ label: string; value: string }>) ?? [];
  const stats = (data.stats as Array<{ label: string; value: string }>) ?? [];

  // Generate initials for avatar
  const initials = name.split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();

  let html = `<div style="padding:16px;font-family:system-ui,sans-serif;background:#1a1a2e;border:1px solid #333;border-radius:8px;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
      <div style="width:48px;height:48px;border-radius:50%;background:#6c5ce7;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0;">${esc(initials)}</div>
      <div>
        <div style="font-size:16px;font-weight:600;color:#e0e0e0;">${esc(name)}</div>
        ${subtitle ? `<div style="font-size:12px;color:#888;">${esc(subtitle)}</div>` : ''}
      </div>
    </div>`;

  if (fields.length) {
    html += '<div style="margin-bottom:12px;">';
    for (const f of fields) {
      html += `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #222;">
        <span style="font-size:12px;color:#888;font-family:ui-monospace,monospace;">${esc(f.label)}</span>
        <span style="font-size:12px;color:#e0e0e0;">${esc(f.value)}</span>
      </div>`;
    }
    html += '</div>';
  }

  if (stats.length) {
    html += '<div style="display:flex;gap:12px;flex-wrap:wrap;">';
    for (const s of stats) {
      html += `<div style="flex:1;min-width:60px;text-align:center;padding:8px;background:#222;border-radius:6px;">
        <div style="font-size:18px;font-weight:700;color:#e0e0e0;">${esc(s.value)}</div>
        <div style="font-size:9px;color:#888;font-family:ui-monospace,monospace;text-transform:uppercase;margin-top:2px;">${esc(s.label)}</div>
      </div>`;
    }
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
