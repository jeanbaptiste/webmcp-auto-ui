/** tags — Tag / badge group */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const label = data.label as string | undefined;
  const tags = (data.tags as Array<{ text: string; active?: boolean }>) ?? [];

  let html = '<div style="padding:12px 16px;font-family:system-ui,sans-serif;">';
  if (label) html += `<div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">${esc(label)}</div>`;
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
  for (const tag of tags) {
    const bg = tag.active ? '#6c5ce7' : '#2a2a3e';
    const color = tag.active ? '#fff' : '#ccc';
    const border = tag.active ? '#6c5ce7' : '#555';
    html += `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-family:ui-monospace,monospace;background:${bg};color:${color};border:1px solid ${border};">${esc(tag.text)}</span>`;
  }
  html += '</div></div>';
  container.innerHTML = html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
