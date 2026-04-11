/** list — Ordered list of items */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const items = (data.items as string[]) ?? [];

  let html = '<div style="padding:12px 16px;font-family:system-ui,sans-serif;">';
  if (title) html += `<div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">${esc(title)}</div>`;
  html += '<ol style="margin:0;padding-left:20px;">';
  for (const item of items) {
    html += `<li style="font-size:13px;color:#e0e0e0;padding:3px 0;">${esc(item)}</li>`;
  }
  html += '</ol></div>';
  container.innerHTML = html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
