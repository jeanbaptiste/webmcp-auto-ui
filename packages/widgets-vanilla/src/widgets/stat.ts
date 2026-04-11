/** stat — KPI / counter / total */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const label = (data.label as string) ?? '';
  const value = (data.value as string) ?? '';
  const trend = (data.trend as string) ?? '';
  const trendDir = (data.trendDir as string) ?? 'neutral';

  const arrow = trendDir === 'up' ? '\u2191' : trendDir === 'down' ? '\u2193' : '';
  const trendColor = trendDir === 'up' ? '#00b894' : trendDir === 'down' ? '#e17055' : '#888';

  container.innerHTML = `
    <div style="padding:12px 16px;font-family:system-ui,sans-serif;">
      <div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">${esc(label)}</div>
      <div style="font-size:28px;font-weight:700;color:#e0e0e0;line-height:1.2;">${esc(value)}</div>
      ${trend ? `<div style="font-size:12px;color:${trendColor};margin-top:4px;font-family:ui-monospace,monospace;">${arrow} ${esc(trend)}</div>` : ''}
    </div>
  `;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
