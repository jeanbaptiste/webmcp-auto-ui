/** trombinoscope — People grid with badges */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const people = (data.people as Array<{ name: string; subtitle?: string; badge?: string; color?: string }>) ?? [];
  const columns = (data.columns as number) ?? 4;

  let html = '<div style="padding:12px 16px;font-family:system-ui,sans-serif;">';
  if (title) html += `<div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">${esc(title)}</div>`;
  html += `<div style="display:grid;grid-template-columns:repeat(${columns}, 1fr);gap:12px;">`;

  for (const p of people) {
    const color = p.color ?? '#6c5ce7';
    const initials = p.name.split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
    html += `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:12px 4px;">
      <div style="width:40px;height:40px;border-radius:50%;background:${esc(color)};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;margin-bottom:6px;">${esc(initials)}</div>
      <div style="font-size:12px;font-weight:600;color:#e0e0e0;margin-bottom:2px;">${esc(p.name)}</div>
      ${p.subtitle ? `<div style="font-size:10px;color:#888;">${esc(p.subtitle)}</div>` : ''}
      ${p.badge ? `<div style="margin-top:4px;font-size:9px;padding:2px 8px;border-radius:10px;background:#2a2a3e;color:${esc(color)};border:1px solid ${esc(color)};">${esc(p.badge)}</div>` : ''}
    </div>`;
  }

  html += '</div></div>';
  container.innerHTML = html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
