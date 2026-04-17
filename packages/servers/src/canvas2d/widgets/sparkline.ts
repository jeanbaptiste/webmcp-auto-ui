// @ts-nocheck
// Sparkline — minimal inline line chart, no axes
import { createCanvas, COLORS } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const values = (data.values ?? []) as number[];
  const color = (data.color as string) ?? COLORS[4];
  const filled = (data.filled as boolean) ?? true;
  if (!values.length) { container.textContent = '[sparkline: no data]'; return; }

  let vMin = Infinity, vMax = -Infinity;
  for (const v of values) { if (v < vMin) vMin = v; if (v > vMax) vMax = v; }
  if (vMin === vMax) { vMin -= 1; vMax += 1; }
  const vR = vMax - vMin;
  const n = values.length;

  const { cleanup } = createCanvas(container, (ctx, W, H) => {
    const pad = 4;
    const stepX = (W - pad * 2) / (n - 1 || 1);

    if (filled) {
      ctx.beginPath(); ctx.moveTo(pad, H - pad);
      for (let i = 0; i < n; i++) ctx.lineTo(pad + i * stepX, H - pad - ((values[i] - vMin) / vR) * (H - pad * 2));
      ctx.lineTo(pad + (n - 1) * stepX, H - pad); ctx.closePath();
      ctx.fillStyle = color + '30'; ctx.fill();
    }

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = pad + i * stepX, y = H - pad - ((values[i] - vMin) / vR) * (H - pad * 2);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();

    // End dot
    const lx = pad + (n - 1) * stepX, ly = H - pad - ((values[n - 1] - vMin) / vR) * (H - pad * 2);
    ctx.beginPath(); ctx.arc(lx, ly, 2.5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  }, 200, 50);

  return cleanup;
}
