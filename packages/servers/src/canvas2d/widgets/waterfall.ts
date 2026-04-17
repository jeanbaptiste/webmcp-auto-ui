// @ts-nocheck
// Waterfall chart — cumulative additions/subtractions
import { createCanvas, drawAxis, formatNum } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const items = (data.items ?? []) as { label: string; value: number }[];
  const title = (data.title as string) ?? '';
  if (!items.length) { container.textContent = '[waterfall: no data]'; return; }

  // Compute cumulative
  const cumulative: number[] = [0];
  for (const item of items) cumulative.push(cumulative[cumulative.length - 1] + item.value);
  const total = cumulative[cumulative.length - 1];

  let vMin = Math.min(...cumulative, 0), vMax = Math.max(...cumulative, total);
  if (vMin === vMax) { vMin -= 1; vMax += 1; }
  const pad = (vMax - vMin) * 0.05; vMin -= pad; vMax += pad;
  const vR = vMax - vMin;

  const { cleanup } = createCanvas(container, (ctx, W, H) => {
    const m = { top: title ? 30 : 14, right: 14, bottom: 50, left: 52 };
    const pW = W - m.left - m.right, pH = H - m.top - m.bottom;
    const n = items.length;

    if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }
    drawAxis(ctx, m.left, m.top + pH, pH, vMin, vMax, false);

    const barW = (pW / (n + 1)) * 0.7;
    const toY = (v: number) => m.top + pH - ((v - vMin) / vR) * pH;

    // Zero line
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(m.left, toY(0)); ctx.lineTo(m.left + pW, toY(0)); ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < n; i++) {
      const x = m.left + (i + 0.5) * (pW / (n + 1)) - barW / 2;
      const start = cumulative[i];
      const end = cumulative[i + 1];
      const y1 = toY(Math.max(start, end));
      const y2 = toY(Math.min(start, end));
      const positive = items[i].value >= 0;
      ctx.fillStyle = positive ? '#10b981' : '#ef4444';
      ctx.fillRect(x, y1, barW, y2 - y1);

      // Connector line
      if (i < n - 1) {
        ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(x + barW, toY(end)); ctx.lineTo(x + barW + (pW / (n + 1)) * 0.3, toY(end)); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Total bar
    const tx = m.left + (n + 0.5) * (pW / (n + 1)) - barW / 2;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(tx, toY(Math.max(0, total)), barW, Math.abs(toY(0) - toY(total)));

    // Labels
    ctx.font = '9px system-ui'; ctx.fillStyle = '#555'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i < n; i++) {
      const x = m.left + (i + 0.5) * (pW / (n + 1));
      ctx.save(); ctx.translate(x, m.top + pH + 6); ctx.rotate(-0.4); ctx.fillText(items[i].label, 0, 0); ctx.restore();
    }
    ctx.save(); ctx.translate(m.left + (n + 0.5) * (pW / (n + 1)), m.top + pH + 6); ctx.rotate(-0.4); ctx.fillText('Total', 0, 0); ctx.restore();
  });

  return cleanup;
}
