/** chart — Simple bar chart */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = data.title as string | undefined;
  const bars = (data.bars as [string, number][]) ?? [];
  const max = Math.max(...bars.map(b => b[1]), 1);

  let html = '<div style="padding:12px 16px;font-family:system-ui,sans-serif;">';
  if (title) html += `<div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">${esc(title)}</div>`;
  html += '<div style="display:flex;align-items:flex-end;gap:6px;height:80px;">';
  for (const [label, val] of bars) {
    const pct = Math.round((val / max) * 100);
    html += `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="width:100%;border-radius:3px 3px 0 0;background:rgba(108,92,231,0.8);height:${pct}%;min-height:2px;transition:height 0.3s;"></div>
      <span style="font-size:9px;font-family:ui-monospace,monospace;color:#888;">${esc(label)}</span>
    </div>`;
  }
  html += '</div></div>';
  container.innerHTML = html;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
