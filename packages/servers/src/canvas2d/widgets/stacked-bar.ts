// @ts-nocheck
// Stacked bar chart — multiple series stacked vertically
import { createCanvas, COLORS, drawAxis } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const labels = (data.labels ?? []) as string[];
  const series = (data.series ?? []) as { name: string; values: number[] }[];
  const title = (data.title as string) ?? '';
  if (!series.length) { container.textContent = '[stacked-bar: no data]'; return; }

  const n = labels.length || series[0].values.length;
  // Compute totals
  const totals = Array(n).fill(0);
  for (const s of series) for (let i = 0; i < n; i++) totals[i] += (s.values[i] ?? 0);
  const vMax = Math.max(...totals, 0);

  const { canvas, ctx } = createCanvas(container);
  const W = 500, H = 400;
  const m = { top: title ? 30 : 14, right: 14, bottom: 50, left: 52 };
  const pW = W - m.left - m.right, pH = H - m.top - m.bottom;

  if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }
  drawAxis(ctx, m.left, m.top + pH, pH, 0, vMax, false);

  const barW = (pW / n) * 0.7;
  const gap = (pW / n) * 0.3;

  for (let i = 0; i < n; i++) {
    let cumY = 0;
    for (let s = 0; s < series.length; s++) {
      const v = series[s].values[i] ?? 0;
      const barH = (v / (vMax || 1)) * pH;
      const x = m.left + i * (pW / n) + gap / 2;
      const y = m.top + pH - cumY - barH;
      ctx.fillStyle = COLORS[s % COLORS.length];
      ctx.fillRect(x, y, barW, barH);
      cumY += barH;
    }
  }

  // Labels
  ctx.font = '10px system-ui'; ctx.fillStyle = '#555'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let i = 0; i < Math.min(n, labels.length); i++) {
    const x = m.left + i * (pW / n) + (pW / n) / 2;
    ctx.save(); ctx.translate(x, m.top + pH + 6); ctx.rotate(-0.4); ctx.fillText(labels[i], 0, 0); ctx.restore();
  }

  // Legend
  ctx.font = '10px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (let s = 0; s < series.length; s++) {
    const lx = m.left + s * 80, ly = m.top - 10;
    ctx.fillStyle = COLORS[s % COLORS.length]; ctx.fillRect(lx, ly - 4, 10, 8);
    ctx.fillStyle = '#333'; ctx.fillText(series[s].name, lx + 14, ly);
  }

  return () => { canvas.remove(); };
}
