// @ts-nocheck
// Heatmap — colored grid cells with cold→hot scale
import { createCanvas, coldHot, formatNum } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const values = (data.values ?? []) as number[][];
  const xLabels = (data.xLabels ?? []) as string[];
  const yLabels = (data.yLabels ?? []) as string[];
  const title = (data.title as string) ?? '';
  const rows = values.length, cols = rows > 0 ? values[0].length : 0;
  if (!rows || !cols) { container.textContent = '[heatmap: no data]'; return; }

  let vMin = Infinity, vMax = -Infinity;
  for (const row of values) for (const v of row) { if (v < vMin) vMin = v; if (v > vMax) vMax = v; }
  if (vMin === vMax) { vMin -= 1; vMax += 1; }
  const vRange = vMax - vMin;

  const { canvas, ctx } = createCanvas(container);
  const W = 500, H = 400;
  const m = { top: title ? 30 : 10, right: 60, bottom: 40, left: 60 };
  const pW = W - m.left - m.right, pH = H - m.top - m.bottom;
  const cellW = pW / cols, cellH = pH / rows;

  if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = coldHot((values[r][c] - vMin) / vRange);
      ctx.fillRect(m.left + c * cellW, m.top + r * cellH, cellW - 0.5, cellH - 0.5);
    }
  }

  ctx.font = '10px system-ui'; ctx.fillStyle = '#555'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let c = 0; c < Math.min(cols, xLabels.length); c++) ctx.fillText(xLabels[c], m.left + (c + 0.5) * cellW, m.top + pH + 4, cellW - 2);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let r = 0; r < Math.min(rows, yLabels.length); r++) ctx.fillText(yLabels[r], m.left - 4, m.top + (r + 0.5) * cellH);

  // Legend
  const lx = W - m.right + 10, ly = m.top, lw = 14, lh = pH;
  for (let i = 0; i < lh; i++) { ctx.fillStyle = coldHot(1 - i / lh); ctx.fillRect(lx, ly + i, lw, 1.5); }
  ctx.font = '9px system-ui'; ctx.fillStyle = '#555'; ctx.textAlign = 'left';
  ctx.textBaseline = 'top'; ctx.fillText(formatNum(vMax), lx + lw + 3, ly);
  ctx.textBaseline = 'bottom'; ctx.fillText(formatNum(vMin), lx + lw + 3, ly + lh);

  return () => { canvas.remove(); };
}
