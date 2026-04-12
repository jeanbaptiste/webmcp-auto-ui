// @ts-nocheck
// Bubble chart — scatter with variable radius
import { createCanvas, COLORS, drawAxis, drawGrid } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const points = (data.points ?? []) as { x: number; y: number; r: number; label?: string; category?: string }[];
  const title = (data.title as string) ?? '';
  if (!points.length) { container.textContent = '[bubble: no data]'; return; }

  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity, rMax = 0;
  for (const p of points) {
    if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y;
    if (p.r > rMax) rMax = p.r;
  }
  if (xMin === xMax) { xMin -= 1; xMax += 1; }
  if (yMin === yMax) { yMin -= 1; yMax += 1; }

  const catMap = new Map<string, number>(); let ci = 0;
  for (const p of points) if (p.category && !catMap.has(p.category)) catMap.set(p.category, ci++);

  const { canvas, ctx } = createCanvas(container);
  const W = 500, H = 400;
  const m = { top: title ? 30 : 14, right: 14, bottom: 44, left: 52 };
  const pW = W - m.left - m.right, pH = H - m.top - m.bottom;

  if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }
  drawGrid(ctx, m.left, m.top + pH, pW, pH, xMin, xMax, yMin, yMax);
  drawAxis(ctx, m.left, m.top + pH, pW, xMin, xMax, true);
  drawAxis(ctx, m.left, m.top + pH, pH, yMin, yMax, false);

  const xR = xMax - xMin, yR = yMax - yMin;
  const maxRadius = 30;
  for (const p of points) {
    const sx = m.left + ((p.x - xMin) / xR) * pW;
    const sy = m.top + pH - ((p.y - yMin) / yR) * pH;
    const sr = Math.max(3, (p.r / (rMax || 1)) * maxRadius);
    const color = COLORS[(p.category ? (catMap.get(p.category) ?? 0) : 0) % COLORS.length];
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = color + '88'; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  }

  return () => { canvas.remove(); };
}
