// @ts-nocheck
// Step chart — line chart with step transitions (no interpolation)
import { createCanvas, COLORS, drawAxis, drawGrid } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const values = (data.values ?? []) as number[];
  const labels = (data.labels ?? []) as string[];
  const title = (data.title as string) ?? '';
  const color = (data.color as string) ?? COLORS[4];
  if (!values.length) { container.textContent = '[step-chart: no data]'; return; }

  let vMin = Math.min(...values), vMax = Math.max(...values);
  if (vMin === vMax) { vMin -= 1; vMax += 1; }

  const { cleanup } = createCanvas(container, (ctx, W, H) => {
    const m = { top: title ? 30 : 14, right: 14, bottom: 44, left: 52 };
    const pW = W - m.left - m.right, pH = H - m.top - m.bottom;
    const n = values.length;
    const vR = vMax - vMin;

    if (title) { ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 18); }
    drawGrid(ctx, m.left, m.top + pH, pW, pH, 0, n - 1, vMin, vMax);
    drawAxis(ctx, m.left, m.top + pH, pW, 0, n - 1, true);
    drawAxis(ctx, m.left, m.top + pH, pH, vMin, vMax, false);

    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const x = m.left + (i / (n - 1 || 1)) * pW;
      const y = m.top + pH - ((values[i] - vMin) / vR) * pH;
      if (i === 0) { ctx.moveTo(x, y); }
      else {
        ctx.lineTo(x, m.top + pH - ((values[i - 1] - vMin) / vR) * pH); // horizontal
        ctx.lineTo(x, y); // vertical
      }
    }
    ctx.stroke();

    // Dots
    for (let i = 0; i < n; i++) {
      const x = m.left + (i / (n - 1 || 1)) * pW;
      const y = m.top + pH - ((values[i] - vMin) / vR) * pH;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    }
  });

  return cleanup;
}
