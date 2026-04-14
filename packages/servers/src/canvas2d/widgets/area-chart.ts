// @ts-nocheck
// Area chart — line chart with filled area beneath
import { createCanvas, COLORS, drawAxis, drawGrid } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const series = (data.series ?? []) as { name?: string; values: number[] }[];
  const title = (data.title as string) ?? '';
  if (!series.length && Array.isArray(data.values)) series.push({ values: data.values as number[] });
  if (!series.length) { container.textContent = '[area-chart: no data]'; return; }

  let vMin = Infinity, vMax = -Infinity;
  let maxLen = 0;
  for (const s of series) { for (const v of s.values) { if (v < vMin) vMin = v; if (v > vMax) vMax = v; } maxLen = Math.max(maxLen, s.values.length); }
  if (vMin === vMax) { vMin -= 1; vMax += 1; }

  const { canvas, ctx } = createCanvas(container);
  const W = 500, H = 400;
  const m = { top: title ? 30 : 14, right: 14, bottom: 44, left: 52 };
  const pW = W - m.left - m.right, pH = H - m.top - m.bottom;

  if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }
  drawGrid(ctx, m.left, m.top + pH, pW, pH, 0, maxLen - 1, vMin, vMax);
  drawAxis(ctx, m.left, m.top + pH, pW, 0, maxLen - 1, true);
  drawAxis(ctx, m.left, m.top + pH, pH, vMin, vMax, false);

  const yR = vMax - vMin;
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    const color = COLORS[si % COLORS.length];
    ctx.beginPath();
    ctx.moveTo(m.left, m.top + pH);
    for (let i = 0; i < s.values.length; i++) {
      const x = m.left + (i / (maxLen - 1 || 1)) * pW;
      const y = m.top + pH - ((s.values[i] - vMin) / yR) * pH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(m.left + ((s.values.length - 1) / (maxLen - 1 || 1)) * pW, m.top + pH);
    ctx.closePath();
    ctx.fillStyle = color + '30'; ctx.fill();
    // Stroke
    ctx.beginPath();
    for (let i = 0; i < s.values.length; i++) {
      const x = m.left + (i / (maxLen - 1 || 1)) * pW;
      const y = m.top + pH - ((s.values[i] - vMin) / yR) * pH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  }

  return () => { canvas.remove(); };
}
