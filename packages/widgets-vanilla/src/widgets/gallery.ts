/** gallery — Image grid gallery */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const images = (data.images as Array<{ src: string; alt?: string; caption?: string }>) ?? [];
  const columns = (data.columns as number) ?? 3;

  let html = '<div style="padding:12px 16px;font-family:system-ui,sans-serif;">';
  if (title) html += `<div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">${esc(title)}</div>`;
  html += `<div style="display:grid;grid-template-columns:repeat(${columns}, 1fr);gap:8px;">`;

  for (const img of images) {
    html += `<div style="display:flex;flex-direction:column;gap:4px;">
      <img src="${esc(img.src)}" alt="${esc(img.alt ?? '')}" style="width:100%;height:auto;border-radius:6px;border:1px solid #333;object-fit:cover;aspect-ratio:4/3;background:#1a1a2e;" loading="lazy" />
      ${img.caption ? `<div style="font-size:10px;color:#888;text-align:center;">${esc(img.caption)}</div>` : ''}
    </div>`;
  }

  html += '</div></div>';
  container.innerHTML = html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
