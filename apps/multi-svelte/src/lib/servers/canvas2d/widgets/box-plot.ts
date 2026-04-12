// @ts-nocheck
// Box plot — quartile visualization
import { createCanvas, COLORS, drawAxis } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const groups = (data.groups ?? []) as { label: string; values: number[] }[];
  const title = (data.title as string) ?? '';
  if (!groups.length) { container.textContent = '[box-plot: no data]'; return; }

  function stats(arr: number[]) {
    const s = [...arr].sort((a, b) => a - b);
    const n = s.length;
    const q1 = s[Math.floor(n * 0.25)];
    const median = s[Math.floor(n * 0.5)];
    const q3 = s[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const lo = Math.max(s[0], q1 - 1.5 * iqr);
    const hi = Math.min(s[n - 1], q3 + 1.5 * iqr);
    return { min: s[0], max: s[n - 1], q1, median, q3, lo, hi };
  }

  const allStats = groups.map(g => stats(g.values));
  let vMin = Infinity, vMax = -Infinity;
  for (const s of allStats) { if (s.min < vMin) vMin = s.min; if (s.max > vMax) vMax = s.max; }
  if (vMin === vMax) { vMin -= 1; vMax += 1; }

  const { canvas, ctx } = createCanvas(container);
  const W = 500, H = 400;
  const m = { top: title ? 30 : 14, right: 14, bottom: 44, left: 52 };
  const pW = W - m.left - m.right, pH = H - m.top - m.bottom;
  const vR = vMax - vMin;

  if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }
  drawAxis(ctx, m.left, m.top + pH, pH, vMin, vMax, false);

  const n = groups.length;
  const boxW = Math.min(40, (pW / n) * 0.6);

  for (let i = 0; i < n; i++) {
    const s = allStats[i];
    const cx = m.left + (i + 0.5) * (pW / n);
    const toY = (v: number) => m.top + pH - ((v - vMin) / vR) * pH;

    // Whiskers
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, toY(s.lo)); ctx.lineTo(cx, toY(s.hi)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - boxW / 4, toY(s.lo)); ctx.lineTo(cx + boxW / 4, toY(s.lo)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - boxW / 4, toY(s.hi)); ctx.lineTo(cx + boxW / 4, toY(s.hi)); ctx.stroke();

    // Box
    const boxTop = toY(s.q3), boxBot = toY(s.q1);
    ctx.fillStyle = COLORS[i % COLORS.length] + '88';
    ctx.fillRect(cx - boxW / 2, boxTop, boxW, boxBot - boxTop);
    ctx.strokeStyle = COLORS[i % COLORS.length]; ctx.lineWidth = 2;
    ctx.strokeRect(cx - boxW / 2, boxTop, boxW, boxBot - boxTop);

    // Median
    ctx.beginPath(); ctx.moveTo(cx - boxW / 2, toY(s.median)); ctx.lineTo(cx + boxW / 2, toY(s.median));
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();

    // Label
    ctx.font = '10px system-ui'; ctx.fillStyle = '#555'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(groups[i].label, cx, m.top + pH + 6);
  }

  return () => { canvas.remove(); };
}
