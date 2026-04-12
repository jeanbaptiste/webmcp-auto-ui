// @ts-nocheck
// Scatter plot — 2D point cloud, optional category colors
import { createCanvas, COLORS, drawAxis, drawGrid, formatNum } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const points = (data.points ?? []) as { x: number; y: number; size?: number; category?: string; label?: string }[];
  const title = (data.title as string) ?? '';
  const xLabel = (data.xLabel as string) ?? '';
  const yLabel = (data.yLabel as string) ?? '';
  if (!points.length) { container.textContent = '[scatter: no data]'; return; }

  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const p of points) {
    if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y;
  }
  if (xMin === xMax) { xMin -= 1; xMax += 1; }
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const pad = 0.05;
  xMin -= (xMax - xMin) * pad; xMax += (xMax - xMin) * pad;
  yMin -= (yMax - yMin) * pad; yMax += (yMax - yMin) * pad;

  const catMap = new Map<string, number>();
  let ci = 0;
  for (const p of points) if (p.category && !catMap.has(p.category)) catMap.set(p.category, ci++);

  const { canvas, ctx } = createCanvas(container);
  const W = 500, H = 400;
  const m = { top: title ? 30 : 14, right: 14, bottom: 44, left: 52 };
  const pW = W - m.left - m.right, pH = H - m.top - m.bottom;

  if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }
  drawGrid(ctx, m.left, m.top + pH, pW, pH, xMin, xMax, yMin, yMax);
  drawAxis(ctx, m.left, m.top + pH, pW, xMin, xMax, true, xLabel);
  drawAxis(ctx, m.left, m.top + pH, pH, yMin, yMax, false, yLabel);

  const xR = xMax - xMin, yR = yMax - yMin;
  for (const p of points) {
    const sx = m.left + ((p.x - xMin) / xR) * pW;
    const sy = m.top + pH - ((p.y - yMin) / yR) * pH;
    const r = p.size != null ? Math.max(1.5, Math.min(8, p.size)) : 3;
    const color = COLORS[(p.category ? (catMap.get(p.category) ?? 0) : 0) % COLORS.length];
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = color + 'cc'; ctx.fill();
  }

  return () => { canvas.remove(); };
}
