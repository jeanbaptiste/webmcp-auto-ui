// @ts-nocheck
// Correlation matrix — heatmap of correlation coefficients
import { createCanvas, coldHot } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const matrix = (data.matrix ?? []) as number[][];
  const labels = (data.labels ?? []) as string[];
  const title = (data.title as string) ?? '';
  const n = matrix.length;
  if (!n) { container.textContent = '[correlation: no data]'; return; }

  const { canvas, ctx } = createCanvas(container);
  const W = 500, H = 400;
  const m = { top: title ? 30 : 10, right: 14, bottom: 60, left: 60 };
  const pW = W - m.left - m.right, pH = H - m.top - m.bottom;
  const cellW = pW / n, cellH = pH / n;

  if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = matrix[r][c]; // expected [-1, 1]
      const t = (v + 1) / 2; // map to [0,1]
      ctx.fillStyle = coldHot(t);
      ctx.fillRect(m.left + c * cellW, m.top + r * cellH, cellW - 1, cellH - 1);
      // Value text
      if (cellW > 28) {
        ctx.font = '9px system-ui'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(v.toFixed(2), m.left + (c + 0.5) * cellW, m.top + (r + 0.5) * cellH);
      }
    }
  }

  // Labels
  ctx.font = '10px system-ui'; ctx.fillStyle = '#555';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let c = 0; c < Math.min(n, labels.length); c++) {
    ctx.save(); ctx.translate(m.left + (c + 0.5) * cellW, m.top + pH + 4); ctx.rotate(-0.6);
    ctx.fillText(labels[c], 0, 0); ctx.restore();
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let r = 0; r < Math.min(n, labels.length); r++) {
    ctx.fillText(labels[r], m.left - 4, m.top + (r + 0.5) * cellH);
  }

  return () => { canvas.remove(); };
}
