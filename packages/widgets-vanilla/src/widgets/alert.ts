/** alert — Alert / notification */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const title = (data.title as string) ?? '';
  const message = (data.message as string) ?? '';
  const level = (data.level as string) ?? 'info';

  const colors: Record<string, { bg: string; border: string; icon: string }> = {
    info:  { bg: '#1a2332', border: '#0984e3', icon: '\u2139\uFE0F' },
    warn:  { bg: '#2d2a1a', border: '#fdcb6e', icon: '\u26A0\uFE0F' },
    error: { bg: '#2d1a1a', border: '#e17055', icon: '\u274C' },
  };
  const c = colors[level] ?? colors.info;

  container.innerHTML = `
    <div style="padding:12px 16px;font-family:system-ui,sans-serif;background:${c.bg};border-left:3px solid ${c.border};border-radius:6px;margin:4px;">
      <div style="font-size:13px;font-weight:600;color:#e0e0e0;margin-bottom:${message ? '4px' : '0'};">${c.icon} ${esc(title)}</div>
      ${message ? `<div style="font-size:12px;color:#aaa;">${esc(message)}</div>` : ''}
    </div>
  `;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
