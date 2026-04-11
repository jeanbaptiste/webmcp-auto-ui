/** cards — Grid of cards with title, description and tags */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const cards = (data.cards as Array<{ title: string; description?: string; subtitle?: string; tags?: string[] }>) ?? [];

  let html = '<div style="padding:12px 16px;font-family:system-ui,sans-serif;">';
  if (title) html += `<div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">${esc(title)}</div>`;
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:12px;">';

  for (const card of cards) {
    html += `<div style="background:#1a1a2e;border:1px solid #333;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px;">
      <div style="font-size:14px;font-weight:600;color:#e0e0e0;">${esc(card.title)}</div>
      ${card.subtitle ? `<div style="font-size:11px;color:#888;">${esc(card.subtitle)}</div>` : ''}
      ${card.description ? `<div style="font-size:12px;color:#aaa;line-height:1.5;">${esc(card.description)}</div>` : ''}
      ${card.tags?.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
        ${card.tags.map(t => `<span style="font-size:9px;padding:2px 6px;border-radius:8px;background:#2a2a3e;color:#888;border:1px solid #444;">${esc(t)}</span>`).join('')}
      </div>` : ''}
    </div>`;
  }

  html += '</div></div>';
  container.innerHTML = html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
