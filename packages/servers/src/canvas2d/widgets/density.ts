// @ts-nocheck
// Density plot — Gaussian kernel density estimation
import { createCanvas, COLORS, drawAxis } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const values = (data.values ?? []) as number[];
  const title = (data.title as string) ?? '';
  const color = (data.color as string) ?? COLORS[4];
  const bandwidth = (data.bandwidth as number) ?? 0;
  if (!values.length) { container.textContent = '[density: no data]'; return; }

  const sorted = Float64Array.from(values).sort();
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const iqr = sorted[Math.floor(n * 0.75)] - sorted[Math.floor(n * 0.25)];
  const h = bandwidth > 0 ? bandwidth : 0.9 * Math.min(stdDev, iqr / 1.34) * Math.pow(n, -0.2);

  const xMin = sorted[0] - 3 * h, xMax = sorted[n - 1] + 3 * h;
  const xRange = xMax - xMin;
  const GRID = 200;
  const density = new Float64Array(GRID);
  let dMax = 0;
  const coeff = 1 / (n * h * Math.sqrt(2 * Math.PI));
  for (let i = 0; i < GRID; i++) {
    const x = xMin + (i / (GRID - 1)) * xRange;
    let sum = 0;
    for (let j = 0; j < n; j++) { const u = (x - sorted[j]) / h; sum += Math.exp(-0.5 * u * u); }
    density[i] = coeff * sum;
    if (density[i] > dMax) dMax = density[i];
  }

  const { canvas, ctx } = createCanvas(container);
  const W = 500, H = 400;
  const m = { top: title ? 30 : 14, right: 14, bottom: 44, left: 52 };
  const pW = W - m.left - m.right, pH = H - m.top - m.bottom;

  if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }
  drawAxis(ctx, m.left, m.top + pH, pW, xMin, xMax, true);
  drawAxis(ctx, m.left, m.top + pH, pH, 0, dMax, false);

  // Filled curve
  ctx.beginPath(); ctx.moveTo(m.left, m.top + pH);
  for (let i = 0; i < GRID; i++) {
    const x = m.left + (i / (GRID - 1)) * pW;
    const y = m.top + pH - (density[i] / dMax) * pH;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(m.left + pW, m.top + pH); ctx.closePath();
  ctx.fillStyle = color + '40'; ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < GRID; i++) {
    const x = m.left + (i / (GRID - 1)) * pW;
    const y = m.top + pH - (density[i] / dMax) * pH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();

  return () => { canvas.remove(); };
}
