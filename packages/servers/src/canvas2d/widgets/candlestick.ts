// @ts-nocheck
// Candlestick chart — OHLC financial data
import { createCanvas, drawAxis } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const candles = (data.candles ?? []) as { open: number; high: number; low: number; close: number; label?: string }[];
  const title = (data.title as string) ?? '';
  if (!candles.length) { container.textContent = '[candlestick: no data]'; return; }

  let vMin = Infinity, vMax = -Infinity;
  for (const c of candles) { if (c.low < vMin) vMin = c.low; if (c.high > vMax) vMax = c.high; }
  if (vMin === vMax) { vMin -= 1; vMax += 1; }
  const pad = (vMax - vMin) * 0.05; vMin -= pad; vMax += pad;
  const vR = vMax - vMin;

  const { cleanup } = createCanvas(container, (ctx, W, H) => {
    const m = { top: title ? 30 : 14, right: 14, bottom: 44, left: 52 };
    const pW = W - m.left - m.right, pH = H - m.top - m.bottom;

    if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }
    drawAxis(ctx, m.left, m.top + pH, pH, vMin, vMax, false);

    const n = candles.length;
    const candleW = Math.min(12, (pW / n) * 0.7);
    const toY = (v: number) => m.top + pH - ((v - vMin) / vR) * pH;

    for (let i = 0; i < n; i++) {
      const c = candles[i];
      const cx = m.left + (i + 0.5) * (pW / n);
      const bullish = c.close >= c.open;
      const color = bullish ? '#10b981' : '#ef4444';

      // Wick
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, toY(c.high)); ctx.lineTo(cx, toY(c.low)); ctx.stroke();

      // Body
      const bodyTop = toY(Math.max(c.open, c.close));
      const bodyBot = toY(Math.min(c.open, c.close));
      const bodyH = Math.max(1, bodyBot - bodyTop);
      ctx.fillStyle = bullish ? color + '88' : color;
      ctx.fillRect(cx - candleW / 2, bodyTop, candleW, bodyH);
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.strokeRect(cx - candleW / 2, bodyTop, candleW, bodyH);
    }
  });

  return cleanup;
}
