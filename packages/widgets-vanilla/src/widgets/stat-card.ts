/** stat-card — Enriched stat card with trend and variant */
export function render(container: HTMLElement, data: Record<string, unknown>): void {
  const label = (data.label as string) ?? '';
  const value = (data.value as string) ?? '';
  const unit = (data.unit as string) ?? '';
  const delta = data.delta as string | undefined;
  const trend = (data.trend as string) ?? 'flat';
  const previousValue = data.previousValue as string | undefined;
  const variant = (data.variant as string) ?? 'default';

  const variantColors: Record<string, { border: string; accent: string }> = {
    default: { border: '#333', accent: '#6c5ce7' },
    success: { border: '#00b894', accent: '#00b894' },
    warning: { border: '#fdcb6e', accent: '#fdcb6e' },
    error:   { border: '#e17055', accent: '#e17055' },
    info:    { border: '#0984e3', accent: '#0984e3' },
  };
  const vc = variantColors[variant] ?? variantColors.default;

  const arrow = trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : '\u2192';
  const trendColor = trend === 'up' ? '#00b894' : trend === 'down' ? '#e17055' : '#888';

  container.innerHTML = `
    <div style="padding:16px;font-family:system-ui,sans-serif;background:#1a1a2e;border:1px solid ${vc.border};border-left:3px solid ${vc.accent};border-radius:8px;">
      <div style="font-size:10px;font-family:ui-monospace,monospace;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">${esc(label)}</div>
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span style="font-size:28px;font-weight:700;color:#e0e0e0;">${esc(value)}</span>
        ${unit ? `<span style="font-size:14px;color:#888;">${esc(unit)}</span>` : ''}
      </div>
      ${delta || previousValue ? `<div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px;">
        ${delta ? `<span style="color:${trendColor};font-family:ui-monospace,monospace;">${arrow} ${esc(delta)}</span>` : ''}
        ${previousValue ? `<span style="color:#555;">vs ${esc(previousValue)}</span>` : ''}
      </div>` : ''}
    </div>
  `;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
